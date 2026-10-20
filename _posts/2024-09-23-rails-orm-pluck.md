---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'ActiveRecord: select, pluck и .ids — как не уронить базу'
date: '2024-10-23 10:30:00 +0300'
categories:
- rails
tags: Rails,PostgreSQL,ActiveRecord,оптимизация запросов,pluck,select
rate: 3
hero_image: "/images/posts/background_post-0025.webp"
---
Оптимизация запросов в Rails — ключевой навык для разработчиков, работающих с PostgreSQL. В этой статье разберём тонкости использования `pluck`, `select` и `ids` в ActiveRecord, чтобы избежать проблем с производительностью и нагрузкой на базу данных. Узнаем, как правильно фильтровать данные на стороне SQL, а не в Ruby, и когда каждый из методов может быть полезен.

---
Иногда `pluck` спасает от N+1. Иногда — превращает `SELECT` в RAM-апокалипсис.
Разберёмся, когда использовать `.select(:id)`, `.pluck(:id)` и `.ids`, чтобы не перегрузить базу.

---

## 🧨 Почему это плохо:

```ruby
Post.where(user_id: User.active.pluck(:id))
```

Если активных пользователей — **100\_000**, то `pluck(:id)` сначала выгрузит все ID в Ruby, и только потом вставит их в `WHERE ... IN (...)`.

🔎 SQL:

```sql
SELECT "id" FROM "users" WHERE "active" = TRUE;
-- А потом:
SELECT * FROM "posts" WHERE "user_id" IN (1, 2, 3, ..., 100000);
```

🙀 Огромный список ID создаёт нагрузку на:

* Сеть (если база удалённая)
* Парсинг SQL в PostgreSQL (ограничения на длину запроса)
* Память на Ruby-стороне

---

## ✅ Как лучше:

```ruby
Post.where(user_id: User.active.select(:id))
```

🔎 SQL:

```sql
SELECT * FROM "posts" WHERE "user_id" IN (
  SELECT "id" FROM "users" WHERE "active" = TRUE
);
```

✅ Всё выполняется **на стороне базы**. Без передачи массивов. Без перегрузки памяти.

---

## 📦 А .ids?

```ruby
User.active.ids
```

То же самое, что `.pluck(:id)`, но **немного оптимизировано** — используется только `id`, и не создаётся массив моделей.

> Но всё равно — это Ruby-массив. Не применяй `.ids` в `where(... IN (...))`, если результатов много.

---

## 📌 Резюме

| Метод         | Где считается   | Риски при больших выборках |
| ------------- | --------------- | -------------------------- |
| `pluck(:id)`  | Ruby            | Да                         |
| `select(:id)` | SQL (вложенный) | Нет                        |
| `ids`         | Ruby            | Да                         |

🧠 Всегда думай: **где происходит фильтрация?**
Если в Ruby — жди беду. Если в SQL — будет счастье.
