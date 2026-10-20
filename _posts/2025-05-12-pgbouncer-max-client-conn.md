---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: PgBouncer и max_client_conn — почему лимит не спасает
date: '2025-05-12 16:30:00 +0300'
categories:
- postgres
- rails
tags: PostgreSQL,PgBouncer,Rails,DevOps,connection pooling,performance
rate: 4
hero_image: "/images/posts/background_post-0094.webp"
---
PostgreSQL — мощная СУБД, но её архитектура с отдельными процессами на каждое соединение может стать узким местом в высоконагруженных Rails-приложениях. PgBouncer решает эту проблему, выступая в роли пулера соединений, однако его настройка требует понимания ключевых параметров вроде max_client_conn и pool_size, особенно в DevOps-среде с ограниченными ресурсами.

---
## 🧮 Зачем вообще PgBouncer?

PostgreSQL — тяжёлый на соединения. Даже простое `psql` создаёт полноценный backend-процесс.

На highload-приложении это превращается в боль:  
**1000 пользователей ≠ 1000 соединений**. Это 1000 *форков*.

PgBouncer выступает как **пул соединений**, который раздаёт уже открытые backend-соединения по мере надобности.

---

## ⚠️ А что такое `max_client_conn`?

Это лимит количества клиентов, одновременно подключённых к PgBouncer. Например:

```ini
max_client_conn = 5000
````

Звучит как будто мы можем обслуживать 5000 соединений… но всё не так просто.

---

## 💥 Где подвох?

**`max_client_conn` — это не гарантия, это максимум.**

PgBouncer работает по принципу:

> Клиент подключился → жди свободного backend-соединения

Если их не хватает (по `pool_size`), клиент **ждёт**. Или получает ошибку `no more connections`.

---

## 🧩 И как это всё ломает прод?

1. У вас настроено `max_client_conn = 5000`
2. Но `pool_size = 100`, а `default_pool_size = 20`
3. Внезапный рост трафика
4. PgBouncer начинает отказывать в соединении или зависать
5. А вы такие: «Но ведь у нас max\_client\_conn большой!»

---

## ✅ Как мониторить?

Смотрите:

```bash
SHOW POOLS;
SHOW STATS;
SHOW CLIENTS;
```

Полезные поля: `cl_active`, `cl_waiting`, `sv_active`, `sv_idle`

Если много `cl_waiting` — это сигнал тревоги.

---

## ✅ Как настроить правильно?

* Не гнаться за `max_client_conn`, а правильно рассчитать `pool_size`
* Мониторить `waiting clients`
* Учитывать количество воркеров Puma / Unicorn / Sidekiq

---

## 💡 Вывод

PgBouncer — не серебряная пуля.
Его нужно **настроить, ограничить и мониторить**. А не просто выставить `max_client_conn = 5000` и надеяться на лучшее.
