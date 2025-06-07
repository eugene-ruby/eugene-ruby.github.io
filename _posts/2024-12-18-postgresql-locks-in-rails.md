---
layout: post
title:  "Блокировки в PostgreSQL: SELECT FOR UPDATE и другие способы не словить race condition"
date:   2024-12-18 11:30:00 +0300
rate: 4
tags: PostgreSQL,Ruby on Rails,блокировки,race condition,Sidekiq,конкурентный доступ
version: A49X3
categories:
  - orm
  - rails
  - postgres
toc: true
menubar_toc: true
hero_image: /images/rails.jpg
hero_darken: true
---
Блокировки в PostgreSQL — мощный инструмент для предотвращения race condition при конкурентном доступе к данным. В Ruby on Rails методы вроде `lock` и `SELECT FOR UPDATE` помогают безопасно обновлять записи, а advisory locks позволяют реализовать логические блокировки на уровне приложения.

---
У тебя два Sidekiq-потока, которые одновременно обновляют одну запись? Или гонка между пользователями за ресурсы? Добро пожаловать в мир блокировок.

## 🔒 SELECT FOR UPDATE

```ruby
User.transaction do
  user = User.lock.find(42)
  user.update!(balance: user.balance - 100)
end
````

Этот `lock` создаёт **SELECT ... FOR UPDATE**.
Он блокирует строку до конца транзакции, предотвращая одновременный доступ к той же строке.

---

## 🧬 Как это работает

* Любой другой поток, попытавшийся `SELECT ... FOR UPDATE` ту же строку, будет ждать
* Если обернуть в транзакцию — защищаешь от race condition
* Работает **только с транзакциями**

---

## ⚠️ Без lock — возможны гонки

```ruby
# Поток 1
user = User.find(1)
user.balance -= 100
user.save

# Поток 2
user = User.find(1)
user.balance -= 100
user.save
```

Итог: баланс уменьшен только на 100, а должен был на 200 — потому что оба считали старое значение одновременно.

---

## 🛠 Дополнительные опции

```ruby
User.lock("FOR UPDATE SKIP LOCKED")
```

* `SKIP LOCKED` — пропускает заблокированные строки (например, при пуле задач)
* `NOWAIT` — не ждёт, сразу падает, если строка уже заблокирована

---

## 🧱 Advisory locks

Для блокировки **на уровне логики**, а не строк:

```ruby
ActiveRecord::Base.connection.execute("SELECT pg_advisory_lock(12345)")
# ... do critical section ...
ActiveRecord::Base.connection.execute("SELECT pg_advisory_unlock(12345)")
```

Работает с произвольными числами. Очень мощный механизм.

---

## 🤓 Как отлаживать

```sql
SELECT * FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid;
```

Показывает, кто кого держит, и почему всё встало.

---

## 📌 Резюме

| Метод                    | Когда использовать                      |
| ------------------------ | --------------------------------------- |
| `lock`                   | Блокировка строки                       |
| `FOR UPDATE SKIP LOCKED` | Пул задач, обработка без гонок          |
| `advisory_lock`          | Логические блокировки (кеш, cron и др.) |
| `NOWAIT`                 | Мгновенная проверка без блокировки      |
