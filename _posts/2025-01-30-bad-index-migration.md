---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: Добавил индекс — и прод лёг. А на стейдже всё было хорошо!
date: '2025-01-30 10:00:00 +0300'
categories:
- migration
- postgres
- rails
tags: PostgreSQL,индексы,Rails,миграции,CONCURRENTLY,блокировки
rate: 4
hero_image: "/images/posts/background_post-0019.webp"
---
Создание индексов в PostgreSQL — мощный инструмент для ускорения запросов, но бездумное их добавление может привести к блокировкам таблиц на проде. В статье разберём, как безопасно добавлять индексы в Rails-приложениях с помощью алгоритма CONCURRENTLY и избежать типичных ошибок, которые приводят к простоям.

---
Ты пишешь миграцию:

```ruby
add_index :users, :email
````

Всё быстро на staging — миграция за секунду.
На проде: таблица на 5 миллионов строк, база повисает, запросы стопорятся, devops кидают в тебя тапками.

---

## 🚨 Что пошло не так?

На staging — 10 строк.
На проде — **миллионы**.
Создание индекса по умолчанию **блокирует таблицу** на запись, если не указана стратегия.

---

## 🧠 Как надо было

Нужно использовать **`algorithm: :concurrently`**:

```ruby
add_index :users, :email, algorithm: :concurrently
```

Это позволит создать индекс **без блокировки таблицы**, но:

* нельзя использовать внутри `change`, только `up/down`
* нельзя внутри транзакции

---

## 🧯 Типичный факап

```ruby
# плохо
class AddIndexToUsers < ActiveRecord::Migration[7.1]
  def change
    add_index :users, :email, algorithm: :concurrently
  end
end
```

❌ Ошибка: *can't run concurrent index creation inside a transaction*

---

## ✅ Как правильно

```ruby
class AddIndexToUsers < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  def change
    add_index :users, :email, algorithm: :concurrently
  end
end
```

---

## 🧪 Проверь себя

* Индекс создаётся на большую таблицу? ➜ `concurrently`
* Таблица активно пишется? ➜ `disable_ddl_transaction!`
* В staging мало данных? ➜ тестируй миграцию на дампе из прода

---

## 💡 Бонус: удаление индекса тоже может блокировать

```ruby
remove_index :users, :email, algorithm: :concurrently
```

## 🛡️ Используй `strong_migrations`

Подключи гем [`strong_migrations`](https://github.com/ankane/strong_migrations), и он **предупредит о рисках**:

```ruby
gem "strong_migrations"
```

Он не даст случайно повесить прод, если ты:

* создаёшь индекс без `concurrently`
* удаляешь колонку
* меняешь тип поля без бэкапа

📢 Это не панацея, но **первая линия обороны**. Особенно, если миграции делает не только синьор.

---

📌 *Вывод*: в миграциях важна не только логика, но и стратегия. Особенно на проде.
