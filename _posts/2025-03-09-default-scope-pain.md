---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: Почему default_scope = боль
date: '2025-03-09 10:30:00 +0300'
categories:
- orm
- rails
tags: Ruby,Rails,default_scope,PostgreSQL,SQL,запросы
rate: 3
hero_image: "/images/posts/background_post-0046.webp"
---
Ruby on Rails предлагает мощные инструменты для работы с данными, но некоторые из них, например default_scope, могут принести больше проблем, чем пользы. В этой статье разберём подводные камни автоматического применения условий к запросам и альтернативные подходы, которые помогут избежать неожиданного поведения при работе с PostgreSQL и сложных SQL-запросах.

---
`default_scope` кажется удобным способом избавиться от повторяющегося фильтра. Но чаще всего он становится источником боли.

## 😇 Наивное использование

```ruby
class User < ApplicationRecord
  default_scope { where(active: true) }
end
````

Кажется, ты избавился от дублирования. Теперь `User.all` — это только активные пользователи.

---

## 💥 А потом приходит боль

### 📌 Тесты не видят "неактивных"

```ruby
User.create!(active: false)
expect(User.count).to eq(1) # 💥 Nope. 0
```

### 📌 Админка не показывает "всех"

Ты случайно написал `User.all`, а не `User.unscoped`.

### 📌 Сложность с join’ами и merge

```ruby
Company.joins(:users).merge(User)
# накладывается лишний where(active: true)
```

---

## 🧯 Обходы и костыли

Ты начинаешь:

* использовать `unscoped`
* добавлять "сюрприз" в SQL
* гуглить, почему `merge` не работает как надо

---

## 🔍 Что делать вместо?

Используй **scope**, а не **default\_scope**:

```ruby
class User < ApplicationRecord
  scope :active, -> { where(active: true) }
end

User.active
```

Если хочешь переопределить `.all`, сделай это явно.

---

## 🚨 TL;DR

| Проблема               | Причина                           |
| ---------------------- | --------------------------------- |
| Невидимые записи       | `default_scope` добавляет `where` |
| Ошибки в тестах        | Ожидание всех записей не работает |
| merge не как ожидалось | `default_scope` неявно мешает     |

**Итог:** `default_scope` стоит использовать только в очень узких кейсах — и всегда помнить, что он *по умолчанию везде*.
