---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Prometheus и Grafana: метрики, дашборды и здравый смысл'
short_description: Как собирать HTTP-метрики и время SQL-запросов в Rails-приложении,
  показывать их в Grafana и не перегружать дашборды и алерты.
date: '2024-09-18 12:00:00 +0300'
categories:
- devops
- performance
tags: Ruby on Rails,Monitoring,DevOps,PostgreSQL,Prometheus,Grafana
rate: 4
hero_image: "/images/posts/background_post-0043.webp"
---
Мониторинг приложений — это не роскошь, а необходимость. Prometheus собирает метрики, Grafana помогает их анализировать. Но как избежать типичных ошибок и не превратить дашборды в «стену ужаса»? Разберём на примерах Ruby-приложений.

---

## 🚨 Почему мониторинг — это боль

Представьте: ночь, production, у вас падают запросы. Вы открываете Grafana и видите:
- 15 графиков `server_responses_5xx`, но ни одного графика времени запросов к базе;
- дашборд с 50 метриками, где критичное выделено бледно-розовым;
- алерт, который срабатывает уже 3 часа, но никто не заметил.

Знакомо? Тогда поехали разбираться.

---

## 📊 Теория: Prometheus + Grafana за 5 минут

**Prometheus** — это:
- система сбора и хранения временных рядов;
- pull-модель: Prometheus сам запрашивает метрики у приложения;
- метрики с метками (labels);
- язык запросов PromQL.

**Grafana** — это:
- визуализация метрик;
- дашборды;
- поддержка алертов.

Связка работает так: приложение отдаёт метрики → Prometheus собирает и хранит их → Grafana запрашивает данные у Prometheus и строит графики.

---

## 🛠️ Практика: подключение к Ruby on Rails

### 1. Добавляем `prometheus-client`

```ruby
# Gemfile
gem 'prometheus-client'
```

### 2. Регистрируем метрики

```ruby
# config/initializers/prometheus.rb
require 'prometheus/client'

registry = Prometheus::Client.registry

METRICS = {
  http_requests: registry.counter(
    :http_requests_total,
    docstring: 'Total HTTP requests',
    labels: %i[method route status]
  ),
  db_query_time: registry.histogram(
    :db_query_time_seconds,
    docstring: 'Database query time in seconds'
  ),
  request_duration: registry.histogram(
    :http_request_duration_seconds,
    docstring: 'HTTP request duration in seconds',
    labels: %i[method route status]
  )
}

ActiveSupport::Notifications.subscribe('sql.active_record') do |*args|
  event = ActiveSupport::Notifications::Event.new(*args)
  next if event.payload[:name] == 'SCHEMA'

  METRICS[:db_query_time].observe(event.duration / 1000.0)
end
```

У события `sql.active_record` длительность указана в миллисекундах, а метрика названа в секундах — поэтому делим на 1000. Это время SQL-событий, а не общее время работы базы или ожидания соединения из пула.

### 3. Инструментируем код

Добавим в `ApplicationController` сбор метрик запросов:

```ruby
around_action :track_request_metrics

private

def track_request_metrics
  started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  yield
ensure
  duration = Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at
  route = "#{request.path_parameters[:controller]}##{request.path_parameters[:action]}"
  labels = {
    method: request.method,
    route: route,
    status: response.status.to_s
  }

  METRICS[:http_requests].increment(labels: labels)
  METRICS[:request_duration].observe(duration, labels: labels)
end
```

Для метки `route` используем контроллер и действие, а не `request.path`: иначе каждый URL с новым ID может создать отдельный временной ряд. При необработанном исключении `response.status` внутри контроллера может не совпасть с итоговым HTTP-статусом, который получит клиент. Если нужна точная статистика таких ошибок, измеряйте итоговый ответ на уровне Rack-мидлвара.

### 4. Экспортируем метрики

```ruby
# config/routes.rb
Rails.application.routes.draw do
  get '/metrics', to: 'metrics#index'
end
```

```ruby
# app/controllers/metrics_controller.rb
require 'prometheus/client/formats/text'

class MetricsController < ActionController::Base
  def index
    render plain: Prometheus::Client::Formats::Text.marshal(
      Prometheus::Client.registry
    ), content_type: 'text/plain; version=0.0.4; charset=utf-8'
  end
end
```

Эндпоинт метрик должен быть доступен Prometheus, но не обязательно всему интернету: ограничьте доступ на уровне сети или прокси. Если приложение запущено в нескольких процессах, проверьте, как собираются и отдаются метрики каждого процесса: обычные данные в памяти одного процесса не представляют всё приложение.

---

## 🎛️ Настройка Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'rails_app'
    scrape_interval: 15s
    metrics_path: /metrics
    static_configs:
      - targets: ['your-app:3000']
```

Адрес в `targets` должен быть доступен из Prometheus.

---

## 🖥️ Пример дашборда в Grafana

**Что стоит мониторить в Rails-приложении:**
1. HTTP-запросы: частоту, задержку и долю ошибок;
2. Базу данных: время запросов и, если измеряете его отдельно, состояние пула соединений;
3. Фоновые задачи: Sidekiq или ActiveJob, если они используются;
4. Потребление памяти.

**Пример полезного графика:**

```promql
100 * (
  sum by (route) (rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum by (route) (rate(http_requests_total[5m]))
  or on (route)
  0 * sum by (route) (rate(http_requests_total[5m]))
)
```

Это доля ответов с кодом 5xx по маршрутам в процентах. Когда запросы есть, но ошибок нет, график показывает ноль; для маршрута без запросов ряд не появляется.

---

## 💣 Антипаттерны

### 1. Метрики ради метрик

Собирать всё подряд — путь к шуму и росту числа временных рядов. Особенно осторожно добавляйте метки с множеством возможных значений, например полный URL с ID.

**Что делать:** начинайте с вопросов, на которые должны отвечать метрики, и проверяйте, нужны ли выбранные метки для анализа.

### 2. Дашборд-помойка

50 графиков на одном экране затрудняют поиск проблемы.

**Что делать:** вынесите на главный дашборд ключевые показатели, а детали сгруппируйте по смыслу — HTTP, база данных, фоновые задачи. Цвет должен помогать замечать проблему, но не быть единственным способом её обозначить.

### 3. Алерты, которые никто не проверяет

Большое число уведомлений, на которые не реагируют, мешает заметить важное.

**Что делать:** определите, кто получает алерт и что должен проверить. Разделяйте предупреждения и критичные события, настраивайте эскалацию там, где она нужна.

---

## 🧪 Тестирование метрик

Метрики — это тоже код. Например, в запросном тесте можно проверить, что счётчик увеличился. Подставьте существующий маршрут приложения вместо `/some-path`:

```ruby
describe 'Metrics' do
  it 'increments http_requests on request' do
    expect {
      get '/some-path'
    }.to change {
      METRICS[:http_requests].get(
        labels: { method: 'GET', route: 'pages#show', status: '200' }
      )
    }.by(1)
  end
end
```

Значение `route` в ожидании тоже замените на контроллер и действие выбранного маршрута.

---

## 🎯 Вывод

1. **Prometheus + Grafana** помогают собирать и анализировать метрики Rails-приложения.
2. **Метрики должны отвечать на вопросы** — собирайте то, что сможете интерпретировать.
3. **Дашборды — это UI** — делайте их понятными даже в 3 часа ночи.
4. **У алерта должен быть получатель и действие** — иначе уведомления превращаются в шум.

> «Хороший мониторинг — это когда ночью просыпаются по делу, а не от спама алертами».