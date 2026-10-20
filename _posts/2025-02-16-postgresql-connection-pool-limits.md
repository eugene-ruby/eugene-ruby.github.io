---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: Сколько соединений держать в Puma, Sidekiq и Webhooks?
date: '2025-02-16 12:00:00 +0300'
categories:
- postgres
- database
- rails
tags: PostgreSQL,Ruby on Rails,Puma,Sidekiq,PgBouncer,DevOps
rate: 5
hero_image: "/images/posts/background_post-0006.webp"
---
PostgreSQL — мощная СУБД, но её соединения не безграничны, и превышение лимита может обрушить продакшен. В этой статье разберём, как правильно распределять подключения между Puma, Sidekiq и другими компонентами Ruby on Rails-приложения, чтобы избежать перегрузки базы. Узнаете, как считать активные соединения, настраивать пулы и использовать PgBouncer для эффективного управления ресурсами PostgreSQL в DevOps-среде.

> Одно из самых частых падений продакшна: превышение числа соединений к PostgreSQL. Кто виноват? Все.

---

## 🎭 Распределим роли

| Компонент | Что делает                        | Как считает соединения |
|----------|-----------------------------------|-------------------------|
| Puma     | обрабатывает HTTP запросы         | `workers * threads`     |
| Sidekiq  | выполняет фоновые задачи          | `concurrency`           |
| Cron/Jobs | однократные процессы              | `1 на задачу`           |
| Webhooks | часто запускаются параллельно     | `1 на процесс`          |

---

## 🧮 Как посчитать общее число соединений

```text
Puma (3 воркера по 5 потоков)   => 15
Sidekiq (concurrency: 10)       => 10
Cron/Jobs (3 активных скрипта) => 3
Webhook (5 процессов)           => 5
Итого                           => 33
````

Но база-то может только 100 соединений!

И при этом: админка, psql, pg\_stat\_statements, PgBouncer, PgHero — тоже занимают слоты.

---

## 📉 Что делать

### 1. Используй PgBouncer

Режим `transaction` позволяет перераспределять соединения, уменьшая общее число **активных** слотов в БД.

---

### 2. Puma

```yaml
# config/puma.rb
workers 3
threads 1, 5
```

И тогда pool в `database.yml` должен быть `5`, а не `5 * 3`!

---

### 3. Sidekiq

```yaml
:concurrency: 10
```

А `pool` в `database.yml` — тоже 10. Один воркер — одно соединение.

---

### 4. Webhooks и rake

Не забывай `ActiveRecord::Base.connection_pool.disconnect!` при завершении!

---

## 📌 Вывод

База не резиновая. Число соединений надо **считать руками**.
Лимит PostgreSQL по умолчанию — **100**, и вы его превысите **очень быстро**, если не разложите соединения по полочкам.
