---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: pluck, calculations и кастомный select — быстро, но аккуратно
date: '2024-12-01 11:15:00 +0300'
categories:
- orm
- rails
tags: Ruby,Rails,PostgreSQL,pluck,count,select
rate: 3
hero_image: "/images/posts/background_post-0077.webp"
---
Ruby предлагает мощные инструменты для работы с базой данных, такие как `pluck`, `count` и `select`, которые позволяют оптимизировать запросы и снизить нагрузку на приложение. Однако важно понимать их особенности, чтобы избежать неожиданного поведения и утечек памяти. В этой статье разберёмся, когда и как правильно использовать эти методы в Rails-приложениях с PostgreSQL.

---
Когда тебе не нужны модели — `pluck`, `count`, `sum`, `select(...)` с алиасами могут сэкономить ресурсы. Но с ними тоже есть подводные камни.

## 🍇 pluck

```ruby
User.where(active: true).pluck(:email)
# => ["user1@example.com", "user2@example.com", ...]
````

Возвращает **массив значений**, без моделей. Быстро, потому что Rails не инициализирует объекты.

⚠️ Не используй `.pluck(:id)` в `where(... IN (...))` — это приведёт к загрузке всех ID в память.

---

## 🧮 calculations

```ruby
User.count
User.sum(:age)
User.average(:salary)
```

Выполняются **на SQL уровне**. Отлично масштабируются.

> `average` возвращает `BigDecimal`, не `Float`.

---

## 🧠 select с алиасами

```ruby
User.select("users.id, COUNT(posts.id) AS posts_count")
    .joins(:posts)
    .group("users.id")
```

Можно использовать `user.posts_count`, но:

* Только если ты явно выбрал этот алиас
* Это **не будет доступно**, если ты потом пересоздашь объект

---

## 😵 select ломает ActiveRecord

```ruby
User.select("id, COUNT(*) as total").first.name
# => nil — потому что `name` не загружен
```

Решение: либо выбирать все нужные поля, либо использовать `pluck`.

---

## 📌 Сравнение

| Метод                            | Возвращает            | Когда использовать               |
| -------------------------------- | --------------------- | -------------------------------- |
| `pluck(:email)`                  | массив значений       | Для простых списков              |
| `count`, `sum`                   | число                 | Для отчётов и статистики         |
| `select(...)`                    | объекты с полями      | Для сложных SQL и алиасов        |
| `select("...")` без нужных полей | объект с `nil` полями | Нельзя забывать, что не вернётся |
