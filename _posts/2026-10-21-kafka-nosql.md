---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Kafka: partitions, consumer groups и обработка сообщений'
short_description: Как Kafka распределяет записи и чтение между partitions и consumer
  groups, что означают offsets и lag и как учитывать повторы, rebalance и DLQ.
date: '2026-10-21 09:33:02 +0300'
categories:
- architecture
tags: Kafka
rate: 5
hero_image: "/images/posts/background_post-0084.webp"
---
# Kafka

# 1. Kafka: mental model

```text
producer → topic orders
               ├── partition 0: [offset 0][1][2]… ──→ consumer A ┐
               ├── partition 1: [offset 0][1]…    ──→ consumer B ├─ group billing
               └── partition 2: [offset 0][1][2]… ──→ consumer A ┘

Те же partitions → другая группа analytics → свои consumers и offsets
```

Topic — логическое имя потока; физически он разбит на упорядоченные журналы partitions. Consumer group координирует читателей, а не является дополнительным хранилищем между partition и consumer [1].

| Термин | Короткое объяснение |
|---|---|
| **Broker** | Сервер Kafka, хранящий replicas partitions и обслуживающий клиентов |
| **Topic** | Именованный поток записей, состоящий из partitions |
| **Partition** | Упорядоченный append-only log; единица распределения и consumer assignment |
| **Producer** | Клиент, публикующий record в выбранную partition topic |
| **Consumer** | Клиент, читающий записи и выполняющий обработку |
| **Consumer group** | Consumers с общим group ID, распределяющие partitions и ведущие прогресс группы |
| **Offset** | Позиция записи внутри конкретной partition; не глобальный ID topic |

В отличие от классической work queue, чтение не удаляет запись. Хранение определяется retention/compaction, а разные группы независимо перечитывают поток в пределах сохранившихся данных. Commit offset — сохранение прогресса группы, не команда удалить сообщение. Общая модель: Kafka Introduction [1].

## Partitions и consumers

Для обычной consumer group с автоматическим assignment одна partition в устойчивом назначении читается **одним consumer этой группы**. Один consumer может читать несколько partitions. Другая группа независимо читает те же данные [2].

Пример: topic с 3 partitions, группа из 5 consumers → максимум 3 consumers получают partitions этого topic, остальные простаивают. Если группа подписана на другие topics, у них может быть другая работа. Consumer — экземпляр клиента, не обязательно отдельный сервер [2].

Число partitions задаёт потолок параллельного распределения чтения в этой модели. Внутри обработчика можно добавить параллелизм, но тогда порядок завершения и безопасный commit становятся ответственностью приложения.

**Partitioning ≠ replication:** первая делит разные записи между журналами ради throughput, вторая хранит копии одного журнала на brokers ради устойчивости. У partition есть leader и replicas; replication factor не умножает число независимых partitions для группы [1].

## Ordering и выбор partition

Kafka упорядочивает записи **внутри partition**, общего порядка между partitions нет [1]. Последовательное чтение не гарантирует порядок внешних эффектов, если обработчик запускает работу параллельно.

Producer выбирает partition [3]:

- Указанием номера явно: приложение берёт routing на себя.
- Через partitioner и **message key**: типично hash сериализованного key выбирает partition.
- Без key: распределение зависит от клиента и настроек, часто оптимизируется под batching; это не обязательно round-robin.

`key=order_id` обычно нужен, чтобы события заказа попадали в один журнал. Это гарантируется только при согласованных serializer/partitioner и неизменной схеме распределения. Добавление partitions может изменить mapping key → partition; история по старому key автоматически не переносится [3].

Hot key концентрирует нагрузку на одной partition. Изменение ключа ради распределения может разрушить нужную последовательность. Для одного producer retries при отключённой idempotence и нескольких запросах in-flight могут изменить порядок записей в partition после ошибки отправки [3]; log order и бизнес-порядок — разные вопросы. См. [Producer configuration](https://kafka.apache.org/41/configuration/producer-configs/).

## Offsets, lag, rebalancing

Consumer имеет текущую позицию чтения и **committed offset** для восстановления. Commit `43` означает: при возобновлении чтения начинаем с позиции 43, а записи с меньшими offsets считаем обработанными. Если записи с offset 43 уже нет, следующая доступная запись может иметь больший offset [2].

```text
process → commit → сбой       : возобновим чтение с сохранённой позиции
process → сбой до commit     : возможна повторная обработка
commit → сбой до process     : приложение может пропустить работу
```

Практический выбор — commit после успешной обработки и идемпотентные эффекты; если обработка длится дольше цикла чтения, автоматический commit может опередить её завершение [2]. Kafka commit и запись в произвольную внешнюю БД сами по себе не атомарны: если запись в БД прошла, а commit нет, после сбоя обработка повторится. Слово «Kafka» не обещает end-to-end exactly-once для внешней БД [4].

**Consumer lag** — насколько группа отстаёт по каждой partition. Типичная метрика: доступный конец журнала минус committed offset [5]. Точная база метрики зависит от инструмента и isolation режима [6]. Lag в offsets — не готовая оценка задержки в секундах и не всегда точное число бизнес-событий. Смотрим тренд, возраст данных, skew partitions и throughput обработки.

**Rebalance** — перераспределение assignment при приходе/уходе consumers, потере участника или изменении подписки/partitions [2]. Возможны паузы и повторная обработка после последнего commit; поведение пауз зависит от протокола.

Долгая обработка с нарушением клиентского poll-протокола может привести к потере assignment [6]. При отзыве partitions корректно завершаем/останавливаем их работу и сохраняем только непрерывно обработанный прогресс: commit поверх ещё незавершённого record создаёт пропуск после сбоя [2]. Настройки и условия членства: [Consumer configuration](https://kafka.apache.org/41/configuration/consumer-configs/).

## Dead Letter Queue — DLQ

Обычно отдельный topic для записей, которые нельзя обработать по принятой retry policy. Kafka не переносит произвольный неуспешный record туда автоматически: это логика приложения или framework.

```text
record → обработка → временная ошибка → ограниченный retry/backoff
                  → неисправимые данные → DLQ + диагностика + replay после исправления
```

Сохраняем исходные key/payload, topic/partition/offset, event ID, причину и число попыток. Нужны ответственный за разбор, мониторинг и безопасный повторный запуск.

Публикация в DLQ должна быть подтверждена до продвижения исходного offset. Сбой между публикацией и commit может дать дубль; его учитывают с помощью идемпотентности или Kafka transaction в подходящем consume-produce сценарии [4]. Такая транзакция не делает автоматически атомарными внешние эффекты, например запись в БД [4]. Пропуск «ядовитого» события ради продолжения может нарушить бизнес-порядок зависимых событий — DLQ является частью бизнес-политики, а не бесплатным исправлением.

## Interview answer: Kafka

> Kafka хранит поток в topic, разбитом на упорядоченные partitions. Producer выбирает partition, часто по key. Consumers одной группы делят partitions: каждую читает один участник группы, другие группы имеют независимый прогресс. Поэтому порядок гарантирован внутри partition, а дополнительный consumer сверх числа partitions не добавляет parallelism чтения этого topic.
>
> Offset фиксирует позицию, commit — прогресс для восстановления, lag — отставание. При rebalance назначения меняются, поэтому учитываю повторы и идемпотентность. DLQ использую для необрабатываемых сообщений с диагностикой и контролируемым replay; replication partitions решает устойчивость хранения, а не распределение работы между consumers.

## 🔗 Источники

1. [Apache Kafka 4.1 — Introduction](https://kafka.apache.org/41/getting-started/introduction/)
2. [Apache Kafka 4.1 — KafkaConsumer API](https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
3. [Apache Kafka 4.1 — Producer Configs](https://kafka.apache.org/41/configuration/producer-configs/)
4. [Apache Kafka 4.1 — Design](https://kafka.apache.org/41/design/design/)
5. [Apache Kafka 4.1 — Basic Kafka Operations](https://kafka.apache.org/41/operations/basic-kafka-operations/)
6. [Apache Kafka 4.1 — Consumer Configs](https://kafka.apache.org/41/configuration/consumer-configs/)