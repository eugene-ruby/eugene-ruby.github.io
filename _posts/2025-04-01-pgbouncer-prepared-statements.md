---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'PgBouncer и prepared statements: ошибки Rails в transaction pooling'
short_description: Почему Rails может получать ошибки prepared statements при работе
  через PgBouncer в режиме transaction pooling и когда помогают отключение подготовки
  запросов, настройка PgBouncer или session pooling.
date: '2025-04-01 16:00:00 +0300'
categories:
- database
- development
- devops
tags:
- Connection Pooling
- prepared statements
- transaction mode
rate: 3
hero_image: "/images/posts/background_post-0011.webp"
---
При работе Rails с PostgreSQL через PgBouncer в режиме `transaction` важно учитывать, где хранятся prepared statements. Разберём, почему из-за них возникают ошибки и какие настройки помогают в разных конфигурациях.

## 📉 Проблема

Вы ставите PgBouncer в режиме `transaction`, подключаете Rails — и всё вроде работает. А потом отдельные запросы начинают падать с ошибками, например `PG::InvalidPreparedStatementName`. При миграциях тоже возможны сбои, если они полагаются на состояние серверного соединения между транзакциями.

---

## 🧠 Почему так?

Rails по умолчанию использует **prepared statements**: подготавливает запросы и повторно обращается к ним по имени. В PostgreSQL подготовленный запрос привязан к серверному соединению.

В transaction pooling PgBouncer закрепляет серверное соединение за клиентом только на время транзакции. Следующая транзакция может попасть на другое соединение, где запроса с тем же именем нет. Поведение зависит от версии и настроек PgBouncer, а также от того, как клиент создаёт prepared statements.

---

## 🔥 Последствия

1. Rails подготавливает запрос на серверном соединении A.
2. В следующей транзакции клиенту достаётся соединение B.
3. Если запрос не подготовлен на B, PostgreSQL не узнаёт его имя и может вернуть `PG::InvalidPreparedStatementName`.

`$1` здесь ни при чём: это обозначение параметра запроса, а не имя prepared statement. `PG::ProtocolViolation` тоже не стоит автоматически объяснять этой причиной — для диагностики нужны текст ошибки и условия, при которых она возникает.

---

## 🔧 Как решить

### ✅ Отключить prepared statements в Rails

Если ваша конфигурация PgBouncer не поддерживает используемые Rails prepared statements, добавьте в `config/database.yml`:

```yaml
production:
  adapter: postgresql
  prepared_statements: false
```

Это отключает подготовку запросов в Rails для указанного окружения. Влияние на производительность зависит от нагрузки; оценивать его лучше на своих запросах.

### ✅ Или используйте режим `session` в PgBouncer

В режиме `session` клиент сохраняет одно серверное соединение на всё время своей сессии, поэтому подготовленные на нём запросы остаются доступными. PgBouncer при этом не может перераспределять серверные соединения между активными клиентами после каждой транзакции, как в режиме `transaction`.

---

## 🤔 А может оставить?

Начиная с PgBouncer 1.21 именованные prepared statements, созданные через протокол PostgreSQL, могут работать в transaction pooling, если задано ненулевое `max_prepared_statements`. Это не относится к запросам, созданным SQL-командой `PREPARE`. Проверьте версию PgBouncer, его настройку и способ подготовки запросов вашим клиентом, прежде чем отключать prepared statements в Rails.

---

## 🧩 Альтернатива?

Если проблемы связаны не с prepared statements, а с другим состоянием серверного соединения, их отключение не поможет. Для таких операций может понадобиться `session` pooling или прямое подключение к PostgreSQL. JIT в PostgreSQL не заменяет prepared statements: эти механизмы решают разные задачи.

---

## ✅ Вывод

* В режиме `transaction` подготовленный запрос может оказаться недоступен на следующем серверном соединении.
* Если конфигурация поддерживает именованные protocol-level prepared statements, их можно оставить, настроив `max_prepared_statements`.
* Если не поддерживает — отключите prepared statements в Rails или используйте `session` pooling с учётом его ограничений.