---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: PgBouncer, Puma и Rails — как работают пулы соединений на самом деле
date: '2025-03-22 18:00:00 +0300'
categories:
- postgres
- rails
tags: Ruby,PostgreSQL,Rails,DevOps,Puma,PgBouncer
rate: 4
hero_image: "/images/posts/background_post-0073.webp"
---
Ruby, PostgreSQL и Rails — мощный стек для разработки современных веб-приложений, но без грамотного DevOps-подхода даже опытные разработчики могут столкнуться с проблемами масштабирования. В этой статье разберем ключевые аспекты работы с базами данных, пулерами соединений и многопоточностью, которые помогут избежать типичных ошибок в продакшене. Особое внимание уделим взаимодействию Puma, ActiveRecord и PgBouncer — трио, которое требует тонкой настройки для стабильной работы под нагрузкой.

---

## 🧠 TL;DR

Если ты используешь PgBouncer с Rails, и у тебя Puma в режиме многопоточности —  
**внимание: ActiveRecord может открыть слишком много соединений!**

---

## 🔁 Как работает соединение в Puma?

Puma запускает *несколько воркеров*, каждый из которых — отдельный процесс.  
Внутри каждого — *несколько потоков* (по `threads` в `puma.rb`).

И каждый **поток** может запросить соединение к БД через ActiveRecord.

---

## 🧮 Сколько соединений будет?

Формула простая:

```text
connection_count = workers * max_threads
````

Допустим:

```ruby
workers 4
threads 1, 8
```

Тогда потенциально — 4 × 8 = **32** соединения к PgBouncer *от Rails*.

---

## 🧩 А PgBouncer не справляется?

PgBouncer по умолчанию в режиме `session` — и это плохо.

Каждое соединение из Rails → держится за backend до тех пор, пока клиент не отключится.
А Puma не отключается — это long-lived процессы.

---

## 🩹 Что делать?

1. Переключи PgBouncer в режим `transaction`:

```ini
pool_mode = transaction
```

Теперь backend соединение освобождается сразу после коммита.

2. В `database.yml` добавь:

```yaml
production:
  adapter: postgresql
  ...
  variables:
    application_name: myapp
  prepared_statements: false
```

⚠️ `prepared_statements: false` — обязательно, иначе PostgreSQL выдаст ошибки.

---

## 📉 А что если не отключить?

ActiveRecord будет думать, что держит соединение долго —
а PgBouncer отдаст его другому —
и вы получите `server closed the connection unexpectedly`.

---

## 💡 Вывод

Если у тебя PgBouncer и Puma —
**обязательно разбери, как и где работают соединения**.

* `pool_mode = transaction`
* `prepared_statements = false`
* `max connections = workers * threads`
* `PgBouncer pool_size ≥ sum of all clients per DB`
