---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Очередь на вынос: Sidekiq, ActiveJob, Resque и Delayed::Job'
date: '2024-09-18 12:00:00 +0300'
categories:
- architecture
- rails
tags: Ruby on Rails,Background Jobs,Redis,PostgreSQL,Performance
rate: 3
hero_image: "/images/posts/background_post-0096.webp"
---
Когда вашему Rails-приложению нужно отправить письмо, обработать CSV или просто сделать что-то долгое, встаёт вопрос: «Как не заставлять пользователя ждать?». Ответ — фоновые задачи. В статье разберём четыре популярных инструмента для работы с очередями: их сильные стороны, подводные камни и случаи, когда каждый из них — идеальный выбор.

---
Вы только что нажали «Оплатить»…  
А в это время где-то в недрах сервера:  
`ChargeCreditCardJob.perform_later(order_id)` → `Sidekiq` → `Redis` → **💰**.  
Вот как это работает без вашего участия.

---

## 🧠 Теория: зачем нужны фоновые задачи?

Фоновые задачи (background jobs) решают три ключевые проблемы:

1. **Производительность** — долгие операции не блокируют основной поток
2. **Надёжность** — повторные попытки при ошибках
3. **Масштабируемость** — распределение нагрузки между воркерами

Как выбрать инструмент? Зависит от:
- Объёма задач
- Требований к скорости
- Инфраструктуры (есть ли Redis?)
- Сложности настройки

---

## 🛠️ Обзор инструментов

### 1. Sidekiq (⭐️ Самый популярный)
```ruby
# Gemfile
gem 'sidekiq'
```

**Плюсы:**
- Молниеносная работа (благодаря Redis)
- Поддержка планировщика (Sidekiq-Cron)
- Богатый мониторинг (Web UI)

**Минусы:**
- Требует Redis
- Отложенный запуск доступен и в Sidekiq OSS через `perform_in` и `perform_at`; для этого нужен работающий процесс Sidekiq.

**Когда выбирать:** Высоконагруженные проекты с Redis в стэке.

---

### 2. ActiveJob (⚡️ Стандарт Rails)
```ruby
# Конфигурация
config.active_job.queue_adapter = :sidekiq # или :resque, :delayed_job
```

**Плюсы:**
- Абстракция над разными бэкендами
- Встроен в Rails (минимальная настройка)
- Единый API для всех адаптеров

**Минусы:**
- Производительность зависит от адаптера
- Меньше возможностей, чем у нативных решений

**Когда выбирать:** Когда нужна гибкость или вы пишете гем/библиотеку.

---

### 3. Resque (🎩 Наследник Twitter)
```ruby
# Gemfile
gem 'resque'
```

**Плюсы:**
- Простая архитектура (Redis + процессы)
- Хорошо документирован
- Поддержка плагинов

**Минусы:**
- Медленнее Sidekiq
- Нет мультипоточности

**Когда выбирать:** Если нужна максимальная стабильность и простота.

---

### 4. Delayed::Job (🗄️ Для минималистов)
```ruby
# Gemfile
gem 'delayed_job_active_record'
```

**Плюсы:**
- Работает с любой БД (PostgreSQL, MySQL)
- Не требует Redis
- Простая установка

**Минусы:**
- Медленнее решений на Redis
- Ограниченный мониторинг

**Когда выбирать:** Для небольших проектов без Redis.

---

## 🔧 Практика: сравниваем производительность

Тест: 10 000 задач «пустышек» на локальной машине (Ruby 3.2, PostgreSQL 14, Redis 6).

| Инструмент       | Время выполнения | Память (средняя) |
|------------------|------------------|------------------|
| Sidekiq          | 42 сек           | 120 MB           |
| Resque           | 1 мин 20 сек     | 150 MB           |
| Delayed::Job     | 2 мин 15 сек     | 90 MB            |
| ActiveJob+Sidekiq| 45 сек           | 125 MB           |

Вывод: **Sidekiq — явный лидер**, но Delayed::Job экономит память.

---

## 💥 Антипаттерны

### 1. «Мега-задача»
```ruby
class ReportGenerationJob < ApplicationJob
  def perform(user_id)
    # 200 строк кода, 5 SQL-запросов, 3 API-вызова
  end
end
```

**Проблема:** Одна задача делает слишком много. При ошибке — перезапуск всего блока.

**Решение:** Разбивать на атомарные задачи:
```ruby
GenerateDataJob.perform_later(user_id)
ExportToCsvJob.perform_later(data_id)
SendEmailJob.perform_later(csv_url)
```

---

### 2. Игнорирование идемпотентности
```ruby
class ChargeCreditCardJob < ApplicationJob
  def perform(order_id)
    order = Order.find(order_id)
    PaymentGateway.charge(order.total) # Что если job выполнится дважды?
  end
end
```

**Решение:**
```ruby
def perform(order_id)
  order = Order.find(order_id)

  order.with_lock do
    return if order.paid?

    PaymentGateway.charge(
      order.total,
      idempotency_key: "order-#{order.id}-charge"
    )
    order.update!(paid: true)
  end
end
```

Проверка статуса выполняется уже под блокировкой. Она сериализует обработку одного заказа в этой базе, но внешний платёж не становится частью транзакции PostgreSQL. Если воркер завершится после списания, но до `update!`, повтор должен использовать тот же ключ идемпотентности; платёжный шлюз должен поддерживать такую возможность. Без неё нужен отдельный процесс сверки неопределённого результата.

---

### 3. «Тихий провал»
```ruby
class ImageProcessingJob < ApplicationJob
  def perform(image_id)
    image = Image.find(image_id)
    image.process! # А если image удалён? Или process! вызовет исключение?
  end
end
```

**Решение:**
```ruby
rescue_from(ActiveRecord::RecordNotFound) do |exception|
  Rails.logger.error "Image not found: #{exception}"
end

rescue_from(Image::ProcessingError) do |exception|
  retry_job(wait: 5.minutes)
end
```

---

## 🎛️ Интеграция с PostgreSQL

Delayed::Job с адаптером Active Record хранит задания в выбранной SQL-базе, в том числе PostgreSQL. Адаптер Active Job `:async` хранит очередь в памяти процесса Rails: он не использует PostgreSQL как хранилище заданий и теряет очередь при завершении процесса.

### Блокировки
```sql
-- Для больших очередей добавляем индекс:
CREATE INDEX index_delayed_jobs_on_locked_at ON delayed_jobs (locked_at);
```

### Оптимизация
```ruby
# config/initializers/delayed_job.rb
Delayed::Worker.destroy_failed_jobs = false
Delayed::Worker.max_attempts = 3
Delayed::Worker.max_run_time = 15.minutes
```

---

## 🎤 Что сказать на собеседовании

> — Почему вы выбрали Sidekiq, а не Resque?

— Для нашего проекта критична скорость обработки задач, а Sidekiq показывает лучшую производительность благодаря многопоточной модели. Плюс, встроенный мониторинг экономит время на настройку.

---

## 🧾 Вывод

1. **High-load?** → Sidekiq + Redis
2. **Нужна абстракция?** → ActiveJob с адаптером под задачу
3. **Без Redis?** → Delayed::Job на PostgreSQL
4. **Легаси или стабильность?** → Resque

Фоновые задачи — как хорошие официанты: работают незаметно, но без них ресторан встанет. Выбирайте инструмент под свои нужды, избегайте антипаттернов, и ваше приложение скажет вам «спасибо» стабильной работой.
