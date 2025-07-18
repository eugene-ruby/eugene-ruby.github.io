---
layout: post
subtitle: <div id="terminal"></div>
title:  "Оптимистичные и пессимистичные блокировки в Rails: когда, зачем и как"
date:   2024-12-26 10:30:00 +0300
rate: 3
tags: Ruby on Rails,PostgreSQL,блокировки,оптимистичная блокировка,пессимистичная блокировка,DevOps
version: 3.2.2
categories:
  - orm
  - rails
  - postgres
toc: true
menubar_toc: true
hero_image: /images/posts/58.jpg
hero_darken: true
---
В мире веб-разработки на Ruby on Rails работа с конкурентными изменениями данных требует особого внимания. PostgreSQL и Rails предлагают два эффективных механизма — оптимистичную и пессимистичную блокировки, которые помогают избежать конфликтов при параллельном доступе. Эти подходы особенно важны в DevOps-среде, где высокая нагрузка и распределённые системы делают целостность данных критически значимой.

Когда ты работаешь с данными, которые могут изменить другие пользователи или потоки, важно не испортить их.  
И Rails предлагает два подхода: **оптимистичное** и **пессимистичное** блокирование.

---

## 🤔 Что такое пессимистичная блокировка?

Это когда ты говоришь: "Я буду работать с этой записью — **никому не трогать!**"

```ruby
User.transaction do
  user = User.lock.find(42)
  user.update!(name: "New name")
end
````

🔒 `SELECT ... FOR UPDATE` — блокирует строку до конца транзакции.
Все, кто попробует получить ту же строку через `lock`, будут **ждать**.

🧠 Хорошо подходит, когда:

* важна целостность данных
* действия занимают время
* возможны частые конфликты

---

## 😌 Что такое оптимистичная блокировка?

Ты говоришь: "Я надеюсь, что никто ничего не изменит... но если вдруг — я замечу".

### Шаг 1: Добавь `lock_version`

```ruby
rails generate migration AddLockVersionToUsers lock_version:integer
```

Rails начнёт использовать это поле **автоматически** при `update`.

```ruby
user1 = User.find(1)
user2 = User.find(1)

user1.update!(name: "Alice") # OK
user2.update!(name: "Bob")   # 💥 ActiveRecord::StaleObjectError
```

Если `lock_version` изменился, `update!` упадёт.

🧠 Хорошо, когда:

* конфликты редки
* важна производительность
* запись можно перезапросить и повторить

---

## 🔍 Когда использовать какой подход?

| Подход                         | Применять, если…                          |
| ------------------------------ | ----------------------------------------- |
| Пессимистичный (`lock`)        | Нужно строго защитить данные от изменений |
| Оптимистичный (`lock_version`) | Можно безопасно перезапросить и повторить |

---

## ⚠️ Предупреждения

* Не забывай обернуть `lock` в транзакцию — иначе он не работает!
* Для `lock_version` нужно использовать `update!`, а не `update` — иначе не увидишь ошибки.

---

🧩 **Совет**: если ты разрабатываешь админку, background job или API с конкурирующими действиями — знай оба метода и выбирай под задачу.
