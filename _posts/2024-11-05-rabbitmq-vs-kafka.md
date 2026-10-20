---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: Очередь или поток? Kafka vs RabbitMQ с практическим уклоном
date: '2024-09-20 12:00:00 +0300'
categories:
- architecture
- rails
- performance
tags: Ruby on Rails,Kafka,RabbitMQ,архитектура,PostgreSQL,брокеры сообщений,message
  brokers
rate: 3
hero_image: "/images/posts/background_post-0063.webp"
---
Выбор между очередями и потоками сообщений — это как выбор между почтальоном и радиостанцией: один гарантированно доставит письмо, другой мгновенно разошлёт новости тысячам. В статье разберём Kafka и RabbitMQ на примерах из Rails-приложений, покажем, как избежать «брокерного ада» и не перегрузить PostgreSQL фоновыми задачами.

---
Вы только что написали `Sidekiq.perform_async` в 42 местах кода…  
А потом: `OrderProcessorJob`, `AnalyticsTrackerJob`, `EmailNotifierJob` падают из-за одной медленной задачи.  
Пора разобраться, когда нужны **очереди**, а когда — **потоки событий**.

---

## 🧠 Теория: очереди vs потоки

### RabbitMQ (очереди)
- **Гарантированная доставка**: каждое сообщение обработано ровно один раз (или N раз при ретраях).
- **Точечная коммуникация**: отправитель знает, кто получатель (например, `billing_service`).
- **Гибкость**: обменники, routing keys, dead-letter очереди.

### Kafka (потоки)
- **Лог событий**: сообщения хранятся и могут быть перечитаны (как журнал транзакций).
- **Широкая аудитория**: подписчики сами решают, какие события им нужны.
- **Высокая пропускная способность**: тысячи сообщений в секунду.

---

## 🔧 Практика в Rails

### RabbitMQ + Bunny
```ruby
# Инициализация
conn = Bunny.new(host: 'rabbitmq')
conn.start
channel = conn.create_channel
queue = channel.queue('orders')

# Отправка
queue.publish({ order_id: 42 }.to_json)

# Получение
queue.subscribe do |delivery_info, properties, body|
  OrderProcessor.call(JSON.parse(body))
end
```

### Kafka + rdkafka-ruby
```ruby
# Producer
producer = Rdkafka::Config.new({ "bootstrap.servers": "kafka:9092" }).producer
producer.produce(
  topic: "user_events",
  payload: { event: "signup", user_id: 123 }.to_json
)

# Consumer
consumer = Rdkafka::Config.new({ "bootstrap.servers": "kafka:9092", "group.id": "analytics" }).consumer
consumer.subscribe("user_events")
consumer.each do |message|
  Analytics.track(JSON.parse(message.payload))
end
```

---

## 💡 Когда что выбрать?

### RabbitMQ если:
- Обработка **фоновых задач** (например, генерация PDF).
- Требуется **точный контроль** за доставкой (например, платежи).
- Работа с **долгими задачами** (ретраи, отложенное выполнение).

### Kafka если:
- Нужна **история событий** (аудиты, аналитика).
- Множество **подписчиков** (логирование + нотификации + кеширование).
- Высокие **нагрузки** (трекеры кликов, IoT-устройства).

---

## 🧪 Тестирование

### RabbitMQ (используем fake adapter)
```ruby
# spec/rails_helper.rb
config.before(:suite) do
  BunnyMock.use_bunny_queue_mock = true
end

# В тесте
it "публикует событие в очередь" do
  expect(BunnyMock.queue(:orders)).to receive(:publish).with(/order_id/)
  OrderCreator.call(params)
end
```

### Kafka (мокаем producer)
```ruby
let(:fake_producer) { instance_double(Rdkafka::Producer) }
before do
  allow(Rdkafka::Config).to receive(:new).and_return(fake_producer)
end

it "отправляет ивент в Kafka" do
  expect(fake_producer).to receive(:produce).with(topic: "user_events", payload: /signup/)
  User.signup!(email: "test@example.com")
end
```

---

## 🔥 Антипаттерны

| Ошибка                          | Последствия                     | Как исправить?                  |
|---------------------------------|---------------------------------|---------------------------------|
| Отправка 1 МБ JSON в Kafka      | Брокер захлебнётся              | Сжимать или ссылаться на S3     |
| 1000 очередей в RabbitMQ        | Сложность мониторинга          | Группировать по доменам         |
| Подписка на все топики Kafka    | Consumer тормозит               | Фильтровать на стороне клиента  |
| Игнорирование `delivery_tag`    | Потеря сообщений               | Подтверждать после обработки    |

---

## 🎤 Что сказать на архитектурном ревью

> — Почему не используем RabbitMQ для аналитики?

— Потому что Kafka даёт возможность перечитать историю событий и подключить новых подписчиков без изменения кода продюсеров.

---

## 🧾 Вывод

**RabbitMQ — ваш надёжный почтальон для задач, Kafka — центральная лента новостей для событий.**  
Выбирайте первый для гарантированной обработки заказов, второй — для масштабируемой аналитики. И никогда не храните состояние в брокере — только в PostgreSQL.

> P.S. Если ваше приложение пока небольшое — возможно, вам хватит и Sidekiq. Но когда появится слово «микросервисы» — возвращайтесь к этой статье.
