---
layout: post
subtitle: <div id="terminal"></div>
title: "PgBouncer не спасёт, если вы не умеете закрывать соединения"
date: 2025-03-13 15:00:00 +0300
rate: 3
tags: PgBouncer,PostgreSQL,Rails,соединения,утечки,CPU
version: A49X3
categories:
  - postgres
  - rails
toc: true
menubar_toc: true
hero_image: /images/architecture.jpg
hero_darken: true
---
PgBouncer — это эффективный инструмент для управления соединениями PostgreSQL, но он не решает проблему утечек соединений в вашем Rails-приложении. Если не освобождать соединения после запросов, база данных быстро столкнётся с перегрузкой CPU, особенно при использовании Puma или Sidekiq. Правильная настройка очистки соединений в контроллерах и воркерах — ключ к стабильной работе системы.

---

> «У нас PgBouncer!»  
> «Почему база на 100% CPU?»  
> — Классика.

## 🤔 В чём суть проблемы

PgBouncer умеет раздавать соединения, **но не закрывает их за вас**.  
Если в Puma (или другом web-сервере) не освобождаются соединения, они **висят навечно**.

---

## 🧪 Пример

Вы делаете `User.find(...)`, но **не вызываете** `ActiveRecord::Base.clear_active_connections!`  
Соединение продолжает жить до перезапуска процесса.

---

## 🧯 Что делать

### 1. Убедитесь, что `config/initializers/connection_management.rb` существует:

```ruby
# config/initializers/connection_management.rb
Rails.application.config.after_initialize do
  ActiveSupport.on_load(:action_controller) do
    after_action do
      ActiveRecord::Base.clear_active_connections!
    end
  end
end
````

Это особенно важно для:

* Web-серверов (Puma, Unicorn)
* Background job workers (Sidekiq)

---

### 2. Sidekiq: не забудь `ActiveRecord::Base.clear_all_connections!`

В worker'е:

```ruby
def perform(*args)
  # ...
ensure
  ActiveRecord::Base.clear_all_connections!
end
```

---

## 🧠 А PgBouncer тут при чём?

Он **раздаёт** соединения.
Но если вы **их не отдаёте обратно** — они заканчиваются.

Пример: пул на 20, но 20 воркеров повисли на вечных соединениях — и вот уже очередь растёт, база тормозит, PgBouncer не при чём.

---

## ✅ Вывод

PgBouncer — мощный инструмент. Но без культуры управления соединениями вы просто получите немного более медленную смерть сервера PostgreSQL.
