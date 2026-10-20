---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: scopes, merge, default_scope и unscope — порядок важен
date: '2024-11-25 10:30:00 +0300'
categories:
- orm
- rails
tags: Ruby,Rails,Scopes,SQL,PostgreSQL,DevOps
rate: 3
hero_image: "/images/posts/background_post-0093.webp"
---
Scopes в Rails — это мощный инструмент для структурирования запросов к базе данных, позволяющий избежать дублирования кода и повысить читаемость. Однако при неправильном использовании merge, default_scope или unscope можно столкнуться с неожиданным поведением SQL-запросов, особенно при работе с PostgreSQL и сложными ассоциациями. В этой статье разберём ключевые особенности scopes и подводные камни, которые важно учитывать в DevOps-среде.

---

`scopes` в Rails — удобный способ переиспользовать логические условия.  
Но стоит добавить `merge`, `default_scope`, или не туда вставить `unscope`, и запрос начнёт вести себя непредсказуемо.

## 🧩 Что такое scope?

```ruby
scope :active, -> { where(active: true) }

User.active
# SELECT * FROM users WHERE active = true
````

Это просто обёртка над `where`, `select`, `joins` и т.д., которую можно вызывать как метод.

---

## 🧬 Объединение с merge

```ruby
scope :active, -> { where(active: true) }

Post.joins(:user).merge(User.active)
```

`merge` добавляет условия из скоупа, когда ты пишешь запрос через join или association.

---

## 🪤 default\_scope

```ruby
class User < ApplicationRecord
  default_scope { where(active: true) }
end
```

Теперь **все** запросы к `User` будут с `WHERE active = true`. Даже `User.find_by(email: ...)`.

Опасно, если забыть — особенно при админских операциях.

---

## 🧼 unscope

```ruby
User.unscoped          # снимает default_scope полностью
User.where(role: :admin).unscope(:where) # убирает только where
```

Очень полезен, если тебе нужно отключить часть условий. Особенно — `order`, `limit`, `select`.

---

## 🎯 Советы

* Никогда не злоупотребляй `default_scope`. Один раз добавишь, потом будешь всюду `unscoped` писать.
* `merge` — отличный способ передать условия между моделями, но **он не вызывает `to_sql` снаружи** — ошибки могут быть скрыты.
* `unscope(:order)` часто помогает при `includes` + `order` — иначе PostgreSQL жалуется на сортировку по невыбранному полю.

---

| Приём             | Назначение                       |
| ----------------- | -------------------------------- |
| `scope`           | Удобные логические обёртки       |
| `merge`           | Применить scope из другой модели |
| `default_scope`   | Автоматический фильтр (опасно)   |
| `unscope(:where)` | Убрать лишние условия            |
| `reorder(...)`    | Заменить `order`, не дополняя    |
