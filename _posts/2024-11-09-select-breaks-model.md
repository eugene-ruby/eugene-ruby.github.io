---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: Почему select("...") ломает методы модели в Rails
short_description: Почему после select в Rails чтение атрибута может вызвать MissingAttributeError
  и чем это отличается от NULL. Разбираем, когда выбирать поля явно, а когда использовать
  pluck.
date: '2024-11-09 11:00:00 +0300'
categories:
- database
- development
tags:
- Debugging
- pluck
- select
rate: 3
hero_image: "/images/posts/background_post-0099.webp"
---
Ты вызываешь `user.name`, а получаешь ошибку — хотя столбец `name` есть в таблице. Такое бывает, если запрос с `.select("...")` не загрузил этот столбец.

## 😵 Проблема

```ruby
User.select("id").first.name
# => ActiveModel::MissingAttributeError: missing attribute 'name'
```

Здесь и далее предполагается, что запрос нашёл пользователя. `select` запросил только `id`, поэтому у полученного объекта нет загруженного атрибута `name`.

---

## 🤖 Как работает ActiveRecord

Когда ты делаешь:

```ruby
User.select("id").first
```

Rails создаёт объект `User`, но из столбцов таблицы загружает только `id`. Методы модели при этом не исчезают: проблема возникает при чтении атрибутов, которые запрос не выбрал, например `name` или `email`.

---

## 💥 А если ты вызовешь `user.name`?

```ruby
user = User.select("id").first
user.attributes # => { "id" => 1 } # если id найденного пользователя равен 1
user.name       # => ActiveModel::MissingAttributeError: missing attribute 'name'
```

Если столбец `name` есть в таблице, но не вошёл в `select`, Active Record поднимет `ActiveModel::MissingAttributeError`. Это не то же самое, что загруженный столбец со значением `NULL`: в таком случае `user.name` вернёт `nil`.

---

## ✅ Как не сломать модель

Выбирай все атрибуты, которые понадобятся при работе с объектом:

```ruby
User.select(:id, :name).first.name
# => значение name, в том числе nil, если в столбце NULL
```

Либо используй `pluck`, если объекты `User` не нужны, а нужны только значения:

```ruby
User.pluck(:name) # => массив значений name
```

---

## 📌 Запомни

| Ситуация | Поведение |
| --- | --- |
| `.select("id")` | Загружен `id`, но не остальные столбцы таблицы |
| `.select(:id, :name)` | Загружены `id` и `name` |
| `.pluck(:id)` | Возвращает массив идентификаторов, а не объекты модели |
| `.first.name` без `name` в `select` | `ActiveModel::MissingAttributeError`, если запись найдена |

---

`select("...")` используют, когда нужно явно указать поля запроса — например, чтобы не загружать ненужные столбцы или добавить агрегат и алиас (`select("users.id, COUNT(posts.id) AS posts_count")`). Для такого агрегата запросу также нужны подходящие `JOIN` и `GROUP BY`. Выбор меньшего числа столбцов может сократить объём передаваемых данных, но объект модели останется частично загруженным.

🧠 **Главный вывод**: `select("...")` не отключает методы Active Record. Он определяет, какие атрибуты загрузятся из базы; попытка прочитать незагруженный атрибут приведёт к ошибке.