---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: scopes, merge, default_scope и unscope — порядок важен
short_description: 'Как в Rails сочетать scope, merge, default_scope и unscope: какие
  условия попадут в запрос, когда фильтр может исчезнуть и как проверить итоговый
  SQL.'
date: '2024-11-25 10:30:00 +0300'
categories:
- orm
- rails
tags: Ruby,Rails,Scopes,SQL,PostgreSQL,DevOps
rate: 3
hero_image: "/images/posts/background_post-0093.webp"
---
Scopes в Rails помогают переиспользовать условия запросов. Но при сочетании `merge`, `default_scope` и `unscope` важно понимать, какие условия останутся в итоговом SQL и в каком порядке применяются методы.

## 🧩 Что такое scope?

```ruby
scope :active, -> { where(active: true) }

User.active
# SELECT * FROM users WHERE active = true
```

Scope возвращает отношение Active Record, которое можно дальше дополнять условиями, сортировкой и соединениями.

---

## 🧬 Объединение с merge

```ruby
scope :active, -> { where(active: true) }

Post.joins(:user).merge(User.active)
```

`merge` применяет условия отношения `User.active` к запросу `Post`. Здесь соединение с `users` уже задано через `joins(:user)`; сам `merge` его не добавляет.

---

## 🪤 default_scope

```ruby
class User < ApplicationRecord
  default_scope { where(active: true) }
end
```

Условие `active = true` добавится к обычным запросам `User`, в том числе к `User.find_by(email: ...)`. Неактивный пользователь не найдётся, даже если запись с таким адресом есть. Это легко упустить, например в админском коде. При необходимости запрос можно выполнить без фильтра через `User.unscoped`.

---

## 🧼 unscope

```ruby
User.unscoped # убирает default_scope целиком

User.where(role: :admin).unscope(:where) # убирает все условия WHERE, включая role
User.where(role: :admin).unscope(where: :role) # убирает условие по role
```

`unscope(:where)` снимает **все** условия `WHERE`, а не только последнее. Если нужно убрать фильтр по конкретному полю, используй `unscope(where: :поле)` и проверь итоговый запрос.

Порядок вызовов тоже влияет на результат:

```ruby
User.where(role: :admin).unscope(:where).where(active: false)
# остаётся условие active = false

User.where(role: :admin).where(active: false).unscope(:where)
# условий WHERE не остаётся
```

Аналогично `unscope(:order)` убирает сортировку, а `reorder(...)` заменяет её новой. `unscope` поддерживает и другие части запроса, в частности `:limit` и `:select`, но снимать их стоит только тогда, когда они действительно не нужны.

---

## 🎯 Советы

* Используй `default_scope`, только если фильтр должен действовать на обычные запросы по всей модели. Для фильтра, который нужен не везде, удобнее именованный scope.
* `merge` не выполняет запрос сам по себе. Чтобы понять, какие условия получились после объединения, посмотри `to_sql` у итогового отношения.
* Если запрос с `DISTINCT` и сортировкой вызывает ошибку PostgreSQL из-за поля, отсутствующего в списке `SELECT`, `unscope(:order)` поможет лишь тогда, когда сортировка не нужна. Если она нужна, согласуй `SELECT` и `ORDER BY`. Сам по себе `includes` такой ошибки не означает.

---

| Приём             | Назначение                       |
| ----------------- | -------------------------------- |
| `scope`           | Переиспользовать условия запроса |
| `merge`           | Применить отношение к другому запросу |
| `default_scope`   | Добавить условие к обычным запросам модели |
| `unscope(:where)` | Убрать все условия `WHERE`       |
| `reorder(...)`    | Заменить сортировку              |