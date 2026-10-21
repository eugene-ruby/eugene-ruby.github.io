---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: Добавил индекс — и прод лёг. А на стейдже всё было хорошо!
short_description: 'Как добавить индекс к большой таблице PostgreSQL в Rails без длительной
  блокировки записей: использовать CONCURRENTLY, отключить транзакцию миграции и учесть
  ограничения этого подхода.'
date: '2025-01-30 10:00:00 +0300'
categories:
- migration
- postgres
- rails
tags: PostgreSQL,индексы,Rails,миграции,CONCURRENTLY,блокировки
rate: 4
hero_image: "/images/posts/background_post-0019.webp"
---
Создание индексов в PostgreSQL ускоряет запросы, но на большой таблице обычное создание индекса может надолго заблокировать запись. Разберём, как использовать `CONCURRENTLY` в миграции Rails и каких ошибок при этом избежать.

---
Ты пишешь миграцию:

```ruby
add_index :users, :email
```

На staging всё быстро — миграция занимает секунду. На проде таблица на 5 миллионов строк: запросы на запись ждут, devops кидают в тебя тапками.

---

## 🚨 Что пошло не так?

На staging — 10 строк. На проде — **миллионы**. PostgreSQL по умолчанию создаёт индекс с блокировкой записи в таблицу на время построения. Чтение при этом не блокируется, но ожидающие операции записи могут накопиться.

---

## 🧠 Как надо было

Использовать **`algorithm: :concurrently`**:

```ruby
add_index :users, :email, algorithm: :concurrently
```

`algorithm: :concurrently` позволяет PostgreSQL строить индекс без блокировки обычных операций записи на всё время построения. Это не означает, что операция мгновенная или совсем обходится без ожиданий: построение может ждать другие транзакции и создавать нагрузку на базу.

Команду нельзя выполнять внутри транзакции миграции. Для этого отключают автоматическую транзакцию через `disable_ddl_transaction!`.

`add_index` обратим в методе `change`, если Active Record может восстановить обратную операцию при откате миграции.

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

❌ Ошибка: *can't run concurrent index creation inside a transaction*.

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

Если построение прервётся, PostgreSQL может оставить невалидный индекс. Проверь его состояние перед повторным запуском миграции: такой индекс может потребоваться удалить и создать заново.

---

## 🧪 Проверь себя

* Индекс создаётся на большой таблице, в которую продолжают писать? ➜ Рассмотри `algorithm: :concurrently`.
* Миграция использует `concurrently`? ➜ Добавь `disable_ddl_transaction!`.
* На staging мало данных? ➜ Проверь миграцию на данных сопоставимого объёма, не перенося чувствительные данные без защиты.

---

## 💡 Бонус: удаление индекса тоже может блокировать

```ruby
remove_index :users, :email, algorithm: :concurrently
```

Для такого удаления тоже нужна миграция с `disable_ddl_transaction!`.

## 🛡️ Используй `strong_migrations`

Гем [`strong_migrations`](https://github.com/ankane/strong_migrations) помогает заметить рискованные миграции:

```ruby
gem "strong_migrations"
```

В зависимости от настроек он может предупредить, например, о создании индекса без `concurrently`, удалении колонки или изменении типа поля. Предупреждение не заменяет проверку миграции с учётом размера таблицы и нагрузки.

---

📌 *Вывод*: в миграциях важна не только логика, но и способ выполнения операции на проде.