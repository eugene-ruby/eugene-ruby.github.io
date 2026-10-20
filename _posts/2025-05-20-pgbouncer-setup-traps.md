---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'PgBouncer: настройка, проблемы и ловушки'
date: '2025-05-20 14:00:00 +0300'
categories:
- postgres
- rails
tags: PgBouncer,PostgreSQL,Rails,оптимизация,настройка,база данных
rate: 3
hero_image: "/images/posts/background_post-0078.webp"
---
PgBouncer — это мощный инструмент для оптимизации работы PostgreSQL, особенно в высоконагруженных Rails-приложениях. Он эффективно управляет соединениями, снижая нагрузку на базу данных и предотвращая её перегрузку. Разберёмся, как правильно настроить PgBouncer, какие режимы работы выбрать и как избежать типичных ошибок при интеграции с Rails и другими компонентами.

---
> PgBouncer — как затычка в ванну: пока стоит — всё держится. Убери — и база захлебнётся.

## 🧠 Зачем нужен PgBouncer

PostgreSQL — не любит десятки и сотни одновременных соединений.  
Каждое соединение = 1 процесс в ОС. При 100–200 соединениях — всё тормозит.

PgBouncer берёт на себя лавину соединений от Puma, Sidekiq и Cron-задач, удерживая к БД 5–10 настоящих коннектов.

---

## ⚙️ Как работает

PgBouncer — это пуллер соединений. Он может работать в трёх режимах:

| Режим         | Как работает                             | Когда использовать         |
|---------------|------------------------------------------|----------------------------|
| `session`     | соединение на всю сессию                 | почти не даёт эффекта      |
| `transaction` | соединение на время SQL транзакции       | **рекомендуется**          |
| `statement`   | соединение на один SQL-запрос            | редко используется         |

---

## 🛠 Пример настройки

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
myapp = host=127.0.0.1 port=5432 dbname=myapp

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = trust
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
````

В Rails:

```yaml
# config/database.yml
production:
  host: 127.0.0.1
  port: 6432
  pool: 20
```

---

## 🪤 Ловушки

### 1. `ActiveRecord::Base.connection.active?` возвращает false

Да, PgBouncer возвращает соединение в пул после транзакции.
Rails считает его "неактивным", хотя всё работает. Не пугайтесь.

---

### 2. PgHero ломается

PgHero любит сидеть в сессии. С PgBouncer в режиме `transaction` он начинает ошибаться.
Вывод: PgHero подключай **напрямую**, в обход PgBouncer.

---

### 3. Миграции и `rails db:prepare`

Они используют `connection.transaction`.
Если вы в режиме `statement`, получите `cannot PREPARE a transaction in this mode`.

Используйте `transaction` или делайте миграции напрямую к PostgreSQL.

---

## 🧩 Вывод

PgBouncer может разгрузить PostgreSQL и продлить его жизнь на годы.
Но **не забывайте**, что это не магия, а системный процесс с особенностями.
