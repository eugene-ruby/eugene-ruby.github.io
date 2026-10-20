---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Транзакции в Rails + PostgreSQL: коммит или откат?'
date: '2024-12-10 14:00:00 +0300'
categories:
- orm
- rails
- postgres
tags: PostgreSQL,Rails,транзакции,ActiveRecord,savepoints,целостность данных
rate: 3
hero_image: "/images/posts/background_post-0045.webp"
---
Транзакции в PostgreSQL и Rails обеспечивают целостность данных, позволяя выполнять операции атомарно — либо все изменения применяются, либо ни одно. В этом материале разберём, как работают вложенные транзакции, когда использовать savepoints и какие подводные камни могут возникнуть при работе с ActiveRecord.

---
Транзакции в PostgreSQL — надёжный способ сделать серию операций атомарной. А Rails помогает с этим одной командой: `ActiveRecord::Base.transaction`.

## 🔁 Как работают транзакции

```ruby
ActiveRecord::Base.transaction do
  user.update!(name: "John")
  account.withdraw!(100)
end
````

Если что-то упадёт — всё откатится. Это важно, например, при переводе денег или создании нескольких связанных записей.

---

## ❌ Что вызывает rollback

* `raise` или `raise ActiveRecord::Rollback` внутри блока
* `update!` с невалидными данными
* Любая ошибка, выброшенная в блоке

Rails ловит исключения и откатывает изменения.

---

## 🧬 Вложенные транзакции

```ruby
ActiveRecord::Base.transaction do
  user.update!(name: "Outer")

  ActiveRecord::Base.transaction(requires_new: true) do
    user.update!(name: "Inner")
  end
end
```

Если `requires_new: true` — создаётся **savepoint**. Можно откатить только вложенную часть.

---

## 😱 А если без `requires_new`?

Rails не создаст новую транзакцию. Ошибка во вложенном блоке откатит **всю внешнюю** транзакцию.

```ruby
ActiveRecord::Base.transaction do
  # ...

  ActiveRecord::Base.transaction do
    raise "Boom"
  end
end
# => всё откатится, даже если outer часть была успешна
```

---

## 🧠 PostgreSQL и savepoint

* PostgreSQL **поддерживает savepoints**
* Rails делает `SAVEPOINT` и `ROLLBACK TO SAVEPOINT` при `requires_new: true`
* В логах БД это можно увидеть

---

## ⚠️ Советы

* Не гнездите транзакции без `requires_new`, если внутри может быть ошибка
* Всегда используйте `!` методы (`update!`, `create!`), чтобы не пропустить silent fail
* Если внутри транзакции отправляешь email или пушишь в очередь — **не делай это до коммита!**
