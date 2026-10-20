---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Prometheus и Grafana: метрики, дашборды и здравый смысл'
date: '2024-09-18 12:00:00 +0300'
categories:
- devops
- performance
tags: Ruby on Rails,Monitoring,DevOps,PostgreSQL,Prometheus,Grafana
rate: 4
hero_image: "/images/posts/background_post-0043.webp"
---
Мониторинг приложений — это не роскошь, а необходимость. Prometheus и Grafana стали стандартом де-факто для сбора метрик и их визуализации. Но как избежать типичных ошибок и не превратить дашборды в "стену ужаса"? Разберём на примерах Ruby-приложений.

---

## � Почему мониторинг — это боль

Представьте: ночь, production, у вас падают запросы. Вы открываете Grafana и видите:
- 15 графиков `server_responses_5xx`, но ни одного `database_query_time`;
- dashboard с 50 метриками, где критичное выделено бледно-розовым;
- алерт, который срабатывает уже 3 часа, но никто не заметил.

Знакомо? Тогда поехали разбираться.

---

## 📊 Теория: Prometheus + Grafana за 5 минут

**Prometheus** — это:
- Система сбора и хранения временных рядов (time-series);
- Pull-модель (сам ходит за метриками);
- Мульти-дименсионные метрики (labels);
- Язык запросов PromQL.

**Grafana** — это:
- Визуализация метрик;
- Гибкие дашборды;
- Поддержка алертов.

Связка работает так:  
`Приложение → (экспортирует метрики) → Prometheus → (хранит) → Grafana → (рисует)`

---

## 🛠️ Практика: подключение к Ruby on Rails

### 1. Добавляем `prometheus-client`

```ruby
# Gemfile
gem 'prometheus-client'
```

### 2. Настраиваем сбор метрик

```ruby
# config/initializers/prometheus.rb
require 'prometheus/client'

Prometheus::Client.configure do |config|
  config.logger = Rails.logger
end

METRICS = {
  http_requests: Prometheus::Client::Counter.new(
    :http_requests_total,
    'Total HTTP requests',
    %i[method path status]
  ),
  db_query_time: Prometheus::Client::Histogram.new(
    :db_query_time_seconds,
    'Database query time',
    %i[model]
  )
}
```

### 3. Инструментируем код

```ruby
# around_action для сбора метрик запросов
around_action :track_request_metrics

def track_request_metrics
  start = Time.now
  yield
ensure
  duration = Time.now - start
  METRICS[:http_requests].increment(
    method: request.method,
    path: request.path,
    status: response.status
  )
  METRICS[:request_duration].observe(duration)
end
```

### 4. Экспортируем метрики

```ruby
# config/routes.rb
require 'prometheus/middleware/collector'
require 'prometheus/middleware/exporter'

Rails.application.routes.draw do
  # ...
  get '/metrics', to: Prometheus::Middleware::Exporter.new
end
```

---

## 🎛️ Настройка Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'rails_app'
    scrape_interval: 15s
    static_configs:
      - targets: ['your-app:3000']
```

---

## 🖥️ Пример дашборда в Grafana

**Что стоит мониторить в Rails-приложении:**
1. HTTP-запросы (RPS, latency, error rate);
2. Базу данных (query time, connection pool);
3. Фоновые задачи (Sidekiq/ActiveJob);
4. Потребление памяти.

**Пример полезного графика:**

```
sum(rate(http_requests_total{status=~"5.."}[1m])) by (path)
/
sum(rate(http_requests_total[1m])) by (path)
```

Это покажет процент ошибок по эндпоинтам.

---

## 💣 Антипаттерны

### 1. Метрики ради метрик
Собирать всё подряд — путь к "шуму".  
**Как правильно:**  
- Метрика должна отвечать на вопрос;
- Если не знаете, как интерпретировать — не собирайте.

### 2. Дашборд-помойка
50 графиков на одном экране — это не мониторинг, это головная боль.  
**Как правильно:**  
- 5-9 ключевых метрик на главный дашборд;
- Группировка по смыслу (HTTP, DB, Background);
- Цветовая схема: красный = проблема.

### 3. Алёрты, которые никто не проверяет
100 алёртов = 0 алёртов.  
**Как правильно:**  
- Алерт — это обещание, что кто-то проснётся ночью;
- Используйте severity levels (warning, critical);
- Настраивайте эскалации.

---

## 🧪 Тестирование метрик

Метрики — это тоже код. Их нужно тестировать.

```ruby
describe 'Metrics' do
  it 'increments http_requests on request' do
    expect {
      get '/some-path'
    }.to change {
      METRICS[:http_requests].get(labels: { method: 'GET', path: '/some-path', status: 200 })
    }.by(1)
  end
end
```

---

## 🎯 Вывод

1. **Prometheus + Grafana** — мощный дуэт для мониторинга Rails-приложений.
2. **Метрики должны быть осмысленными** — собирайте только то, что будете анализировать.
3. **Дашборды — это UI** — делайте их понятными даже в 3 часа ночи.
4. **Алерты — это обещания** — если не готовы реагировать, не настраивайте.

> "Хороший мониторинг — это когда ночью просыпаются по делу, а не от спама алёртами."
