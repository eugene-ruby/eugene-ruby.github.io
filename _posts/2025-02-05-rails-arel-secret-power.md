---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: Rails ORM и этот странный Arel
short_description: Как строить условия и выражения CASE через Arel в Rails, когда
  возможностей Active Record недостаточно и каких ограничений API и безопасности стоит
  учитывать.
date: '2025-02-05 10:30:00 +0300'
categories:
- database
- development
tags:
- SQL
- SQL Injection
rate: 3
hero_image: "/images/posts/background_post-0074.webp"
---
Arel помогает строить SQL-запросы в Ruby on Rails без ручной сборки строк. Он полезен, когда условия формируются динамически или нужны выражения, которые неудобно записывать средствами Active Record. При этом Arel не заменяет обычные методы Active Record и сам по себе не делает любой запрос безопасным.

---
Ты наверняка писал `where("score > ?", 42)` — и задумывался, почему Rails **не даёт синтаксис `.where(score.gt(42))`**?

На самом деле даёт. Для этого можно использовать `Arel`.

---

## 🤖 Что такое Arel?

`Arel` — механизм, который Active Record использует при построении SQL. С ним можно описывать условия и выражения в виде объектов, а затем передавать их методам Active Record:

```ruby
users = User.arel_table
User.where(users[:score].gt(42))
```

---

## 🧪 Зачем использовать Arel?

* Динамически собирать условия без конкатенации строк
* Ссылаться на столбцы и таблицы при построении выражений
* Использовать SQL-выражения, например `CASE`, `COALESCE` и подзапросы

Arel помогает корректно обработать значения в таких выражениях, но имена полей, таблиц и алиасы из пользовательского ввода всё равно нужно проверять по списку разрешённых.

---

## 📦 Примеры Arel-запросов

```ruby
# name = 'Eugene'
t = User.arel_table
User.where(t[:name].eq('Eugene'))

# score > 100 AND active = true
User.where(t[:score].gt(100).and(t[:active].eq(true)))
```

Более сложный пример — условный порядок, при котором администраторы идут первыми:

```ruby
t = User.arel_table
admin_first = Arel::Nodes::Case.new
  .when(t[:admin].eq(true)).then(0)
  .else(1)

User.order(admin_first)
```

Здесь `CASE` строится из Arel-узлов. Если вместо этого использовать `Arel.sql("CASE WHEN admin THEN 0 ELSE 1 END")`, строка останется сырым SQL: подставлять в неё пользовательский ввод небезопасно.

---

## 🔍 ActiveRecord всё ещё круче

В большинстве случаев **Arel не нужен**. Active Record уже умеет:

```ruby
User.where(name: "Alice")                            # → name = 'Alice'
User.where("score > ?", 42)                          # → значение безопасно подставляется
User.where("metadata @> ?", { admin: true }.to_json) # PostgreSQL, если metadata — jsonb
```

Но если ты строишь условия динамически, например для конструктора запросов, Arel может быть удобнее ручной сборки SQL-строк.

---

## 💣 В чём подвох

* Arel — внутренний API Active Record: при обновлении Rails такой код может потребовать изменений
* Документации по нему меньше, чем по публичным методам Active Record
* Выражения иногда сложно читать и отлаживать

---

## 🛠 Когда пригодится

* Конструкторы фильтров (`Admin::UsersQueryBuilder`)
* Сложные сочетания `.or`, `.and`, `.not`, если методов Active Record недостаточно
* Динамические `ORDER BY`, `CASE`, `COALESCE` — после проверки входных параметров
* Составные `JOIN ON ... AND ...`

---

💬 *Вывод*: Arel даёт больше контроля над построением SQL, но добавляет зависимость от внутреннего API. Для типовых запросов лучше оставаться на публичных методах Active Record: их проще читать и поддерживать.