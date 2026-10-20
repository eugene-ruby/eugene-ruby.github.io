---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 10 типичных ошибок при работе с ORM в Rails
date: '2025-01-05 11:00:00 +0300'
categories:
- orm
- rails
tags: ActiveRecord,Ruby on Rails,ORM,PostgreSQL,N+1,scope
rate: 3
hero_image: "/images/posts/background_post-0079.webp"
---
ActiveRecord в Ruby on Rails — это мощный ORM, но даже опытные разработчики часто допускают ошибки, которые убивают производительность. В этой статье разберём 10 типичных проблем с запросами к PostgreSQL и покажем, как их исправлять — от N+1 до неожиданного поведения scope.

---
ActiveRecord — мощный инструмент. Но с ним легко сделать красиво… и при этом ужасно неэффективно. Вот 10 ошибок, которые совершают даже опытные разработчики.

## 1. 🔁 N+1 при `each`

```ruby
User.all.each { |u| puts u.company.name }
# 💥 Генерирует 1 + N запросов
````

🛠 Решение: `includes(:company)`

---

## 2. 💥 `pluck(:id)` в подзапросах

```ruby
Post.where(user_id: User.active.pluck(:id))
```

Загрузит **все id в память**. Может быть **очень дорого**.

🛠 Лучше: `User.active.select(:id)` или `.ids`

---

## 3. 🧊 Потеря полей при `select(...)`

```ruby
User.select("id").first.name # => nil
```

🛠 Выбирай все нужные поля или используй `pluck`

---

## 4. 🤷‍♂️ Забыл `.save` или `.update`

```ruby
user.name = "John"
# и ничего не происходит 😅
```

🛠 Используй `update` или не забывай про `save`

---

## 5. 🧠 Делаешь запросы в цикле

```ruby
users.each { |u| u.posts.count }
```

🛠 Или `includes(:posts)` + `u.posts.size`

---

## 6. ⚠️ Используешь `default_scope`

Он прилипает ко всем запросам и иногда ведёт себя **очень неочевидно**.

🛠 Предпочти явные `scope :active, -> { where(active: true) }`

---

## 7. 🧱 Забыл `.readonly` в сложных `joins`

Когда строишь нестандартный SQL, Rails может попытаться сохранить объект.
Это приведёт к ошибке или багу.

🛠 Добавь `.readonly`

---

## 8. 📉 Используешь `.count` на коллекции

```ruby
users = User.all
users.count # => SELECT COUNT(*) FROM users
users.to_a.count # => Ruby-level count
```

🛠 Делай `.count` **до** загрузки

---

## 9. 🌀 Путаешь `joins` и `includes`

```ruby
User.joins(:posts).where(posts: { title: "foo" }) # ok
User.includes(:posts).where(posts: { title: "foo" }) # => иногда делает JOIN, иногда нет
```

🛠 Если фильтруешь — используй `joins`

---

## 10. 🚀 Не замеряешь запросы

Rails — не угадает за тебя. Используй `bullet`, `rack-mini-profiler` и `EXPLAIN ANALYZE`

---

## 📌 Резюме

| Ошибка          | Что делать вместо                        |
| --------------- | ---------------------------------------- |
| N+1             | `includes` или `preload`                 |
| `pluck(:id)`    | `select(:id)` или `.ids`                 |
| `select(...)`   | Добавляй нужные поля явно                |
| Циклы запросов  | Группировка или предварительная загрузка |
| `default_scope` | Используй именованные `scope`'ы          |
