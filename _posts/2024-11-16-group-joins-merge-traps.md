---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: select, group, having, joins, merge — как сломать ActiveRecord (и выжить)
date: '2024-11-16 14:00:00 +0300'
categories:
- orm
- rails
tags: ActiveRecord,PostgreSQL,SQL,Rails,group,having
rate: 5
hero_image: "/images/posts/background_post-0073.webp"
---
ActiveRecord в Rails — мощный инструмент для работы с PostgreSQL, но даже опытные разработчики сталкиваются с неочевидными ошибками при использовании group, having и merge. В этой статье разберём типичные подводные камни при построении сложных SQL-запросов через ActiveRecord и способы их избежать.

---

Кажется, всё просто: добавил `joins`, сгруппировал `group(...)`, отфильтровал через `having(...)`.  
А потом внезапно `ActiveRecord::StatementInvalid`, `nil вместо поля` или теряются условия. Почему?


## 😵 select + group

```ruby
User.select("users.id").group("users.id").first.name
# => nil 😱
````

Ты сгруппировал по `id`, но `name` не выбрал. В `User`-объекте нет `name`, а Rails не жалуется — просто `nil`.

---

## 🔍 having без group — ошибка

```ruby
User.having("count(posts.id) > 10")
# => ActiveRecord::StatementInvalid: HAVING clause requires GROUP BY
```

`having` работает **только с** `group`. В обычных запросах используй `where`.

---

## ⚠️ merge и потеря условий

```ruby
scope :active, -> { where(active: true) }

Post.joins(:user).merge(User.active)
```

Это работает! Но если ты используешь `includes` или `eager_load`, merge может не сработать или превратиться в `WHERE 1=0`, если условия невалидны.

---

## 👀 А если `joins` + `merge`?

```ruby
User.joins(:posts).merge(Post.published)
```

Это **корректный способ** наложить условия из другого scope, но важно: `merge` не работает без `joins`, если ассоциация ещё не загружена.

---

## 🧨 Итого — частые ловушки

| Конструкция                | Подводный камень                       |
| -------------------------- | -------------------------------------- |
| `select("...")`            | поля вне select будут `nil`            |
| `group(...).having(...)`   | `having` без `group` — ошибка          |
| `merge(...)`               | требует `joins` / `includes`           |
| `joins(:assoc).merge(...)` | ok, но scope должен быть валиден       |
| `eager_load + merge`       | может неожиданно дать пустой результат |

---

📌 Если запрос стал сложнее пары методов — проверь SQL через `.to_sql`.
Rails гибкий, но легко превратить цепочку в минное поле.
