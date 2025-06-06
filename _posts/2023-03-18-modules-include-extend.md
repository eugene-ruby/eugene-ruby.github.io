---
layout: post
title:  "Ruby: include, extend, prepend и refine — кто ты из модулей?"
date:   2023-03-18 12:30:00 +0300
categories:
  - ruby
toc: true
menubar_toc: true
hero_image: /images/ruby.jpeg
hero_darken: true
---

Если ты однажды путал `include` и `extend`, а при слове `prepend` начинал вспоминать про предков — ты не один.  
Ruby-модули — это про **составление поведения**, но с неожиданным поворотом.

---

## 🧩 `include`: добавляем методы как instance-методы

```ruby
module Speak
  def hello
    "Привет!"
  end
end

class Human
  include Speak
end

puts Human.new.hello # => Привет!
````

**`include`** подключает методы как **экземплярные**.
То есть `Speak#hello` станет доступен у `Human.new`.

---

## 🧠 `extend`: добавляем методы как методы самого объекта

```ruby
module Meta
  def version
    "1.0"
  end
end

class App
  extend Meta
end

puts App.version # => 1.0
```

**`extend`** подключает методы как **методы самого объекта**.
В данном случае — класса `App`.

---

## 🔄 `prepend`: магическое include слева

```ruby
module Loud
  def hello
    "ЭТО ПЕРЕПРЕД!"
  end
end

class Robot
  prepend Loud
  def hello
    "Привет от робота"
  end
end

puts Robot.new.hello # => ЭТО ПЕРЕПРЕД!
```

**`prepend`** вставляет модуль **перед** классом в цепочке `ancestors`.

```ruby
puts Robot.ancestors
# => [Loud, Robot, Object, Kernel, BasicObject]
```

---

## 🗺️ Где `include`, где `extend`?

| Что подключаем | Куда подключаем | Какой будет метод          |
| -------------- | --------------- | -------------------------- |
| `include M`    | В класс         | instance method            |
| `extend M`     | В класс         | class method               |
| `extend M`     | В объект        | singleton method           |
| `prepend M`    | В класс         | instance method, но раньше |

---

## 🤯 `using` и `refine` — локальные патчи

Иногда хочется переопределить методы существующих классов, но **не глобально**. Вот тогда — `refine`.

```ruby
module Shout
  refine String do
    def shout
      upcase + "!!!"
    end
  end
end

using Shout

puts "ruby".shout # => RUBY!!!
```

За пределами области `using` метода `shout` **не существует**.

---

## 🔥 Пример подвоха на собеседовании

```ruby
module M
  def greet
    "hello from M"
  end
end

class A
  include M
end

class B
  extend M
end

puts A.new.greet    # => ?
puts B.greet        # => ?
```

**Ответ:**

* `A.new.greet` — работает (instance method)
* `B.greet` — работает (class method)
* `A.greet` — 💥 NoMethodError
* `B.new.greet` — 💥 NoMethodError

---

## ❗ Совет на прод

Если ты пишешь модуль:

* `include` — для **поведения экземпляров**
* `extend self` — для **модульных функций**
* `prepend` — когда нужен **hook** или **override**
* `refine` — когда **нельзя ломать глобально**, но очень хочется

---

🔚 **Вывод:**
Ruby даёт много способов добавить поведение, но всё зависит от того, **куда ты вставляешь модуль**, и **для кого**: объекта, экземпляра или всего класса.
