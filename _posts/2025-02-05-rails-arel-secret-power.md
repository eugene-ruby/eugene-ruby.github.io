---
layout: post
title:  "Rails ORM и этот странный Arel"
date:   2025-02-05 10:30:00 +0300
rate: 3
tags: Arel,Ruby on Rails,SQL,ActiveRecord,запросы,ORM
version: A49X3
categories:
  - orm
  - rails
toc: true
menubar_toc: true
hero_image: /images/rails.jpg
hero_darken: true
---
Arel — это мощный инструмент для работы с SQL-запросами в Ruby on Rails, который позволяет создавать сложные и безопасные запросы без конкатенации строк. Он особенно полезен при динамическом построении условий, работе с подзапросами или нестандартными SQL-выражениями. Хотя ActiveRecord покрывает большинство повседневных задач, Arel даёт разработчикам дополнительную гибкость и контроль над запросами.

---
Ты наверняка писал `where("score > ?", 42)` — и задумывался, а почему Rails **не даёт синтаксис `.where(score.gt(42))`** как в нормальных ORM?

На самом деле — даёт. Просто эта магия зовётся `Arel`.

---

## 🤖 Что такое Arel?

`Arel` — это **внутренний механизм**, на котором работает ActiveRecord. Все `where`, `joins`, `order` — в итоге компилируются в Arel-объекты, а затем в SQL.

Ты можешь использовать Arel напрямую, чтобы писать более сложные и безопасные запросы:

```ruby
users = User.arel_table
User.where(users[:score].gt(42))
````

---

## 🧪 Зачем использовать Arel?

* Динамически собирать условия без конкатенации строк
* Безопасно вставлять поля, имена таблиц и алиасы
* Использовать сложные SQL-выражения (`CASE`, `COALESCE`, подзапросы)

---

## 📦 Примеры Arel-запросов

```ruby
# user.name = 'Eugene'
t = User.arel_table
User.where(t[:name].eq('Eugene'))

# score > 100 AND active = true
User.where(t[:score].gt(100).and(t[:active].eq(true)))
```

Сложный пример — условный порядок:

```ruby
User.order(
  Arel.sql("CASE WHEN admin THEN 0 ELSE 1 END")
)
```

---

## 🔍 ActiveRecord всё ещё круче

В большинстве случаев **Arel не нужен**. ActiveRecord уже умеет:

```ruby
User.where(name: "Alice")                         # → name = 'Alice'
User.where("score > ?", 42)                       # → безопасный bind
User.where("metadata @> ?", { admin: true }.to_json) # JSONB!
```

Но если ты строишь динамический SQL (например, из конфигов или через конструктор запросов) — Arel даёт **более надёжную и чистую альтернативу** строкам.

---

## 💣 В чём подвох

* Arel — **частная API**, может меняться без предупреждения
* Нет нормальной документации
* Иногда сложно читать и отлаживать

---

## 🛠 Когда пригодится

* Конструкторы фильтров (`Admin::UsersQueryBuilder`)
* Сложные `.or`, `.and`, `.not`
* Динамическое `ORDER BY`, `CASE`, `COALESCE`
* Составные `JOIN ON ... AND ...`

---

💬 *Вывод*: Arel — это как бэкэнд ActiveRecord. Если тебе нужно больше контроля и ты не боишься немного SQL — это мощный инструмент. Но если можешь — оставайся в ActiveRecord, он надёжнее и проще.
