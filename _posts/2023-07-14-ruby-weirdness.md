---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: Странности, которые не объясняют в туториалах'
date: '2023-07-14 14:00:00 +0300'
categories:
- ruby
tags: Ruby,подводные камни,сравнение false и nil,object_id,замороженные объекты,собеседования
rate: 3
hero_image: "/images/posts/background_post-0076.webp"
---
Ruby — это мощный и выразительный язык, но иногда его поведение может удивить даже опытных разработчиков. В этой статье разберём подводные камни Ruby: от особенностей сравнения `false` и `nil` до работы с `object_id` и замороженными объектами. Эти нюансы не только помогут глубже понять язык, но и пригодятся на собеседованиях.

---

## ❓ false == nil?

```ruby
false == nil     # => false
!nil             # => true
!!nil            # => false
````

* В Ruby только `false` и `nil` — ложь.
* Но они не равны между собой.

---

## 🔍 object\_id и литералы

```ruby
:foo.object_id == :foo.object_id # => true
"foo".object_id == "foo".object_id # => false
42.object_id == 42.object_id     # => true
```

* **Символы и числа** интернированы.
* **Строки** — новые объекты.

---

## ❄️ frozen по умолчанию?

```ruby
42.frozen?     # => true
:foo.frozen?   # => true
nil.frozen?    # => true
true.frozen?   # => true
```

Да. В Ruby **числа, символы, nil, true, false** — всегда заморожены. Они неизменяемы.

---

## 🧠 eval, class\_eval, instance\_eval

```ruby
eval("1 + 2")                   # => 3
User.class_eval { def x; 42; end }
obj.instance_eval { def y; 99; end }
```

Разные уровни контекста:

* `eval` — глобальный, плох для безопасности
* `class_eval` — изменяет класс
* `instance_eval` — изменяет конкретный объект

---

🔚 **Вывод:**
Ruby странный, но предсказуемый — если знаешь подводные камни. Собеседующий тебя на сеньора скорее всего спросит про `frozen?`, `object_id`, `eval`.
