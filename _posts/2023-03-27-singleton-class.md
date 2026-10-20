---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: class << self и singleton-классы — что это за магия?'
date: '2023-03-27 15:00:00 +0300'
categories:
- ruby
tags: Ruby,Singleton-классы,метапрограммирование,class methods,extend,объекты
rate: 4
hero_image: "/images/posts/background_post-0075.webp"
---
Singleton-классы в Ruby — это мощный инструмент метапрограммирования, позволяющий добавлять уникальные методы к отдельным объектам. Они лежат в основе таких концепций, как class methods и extend, открывая гибкие возможности для настройки поведения объектов и классов. Понимание их работы помогает глубже разобраться в устройстве Ruby и писать более выразительный код.

---

## 🧬 Что такое singleton-класс?

Каждый объект в Ruby может иметь **свой собственный класс**, в котором определяются его уникальные методы. Это и есть **singleton-класс**.

```ruby
str = "hi"

def str.shout
  upcase + "!"
end

puts str.shout # => "HI!"
````

Метод `shout` есть **только у `str`**, не у других строк. Он живёт в singleton-классе этого объекта.

---

## 🪞 Способы взаимодействия

### `class << self`

```ruby
class User
  class << self
    def role
      "admin"
    end
  end
end

puts User.role # => "admin"
```

**`class << self`** открывает singleton-класс текущего объекта (здесь — класса `User`).

---

### `define_singleton_method`

```ruby
robot = Object.new

robot.define_singleton_method(:greet) do
  "👋 Здравствуй, человек!"
end

puts robot.greet # => 👋 Здравствуй, человек!
```

Это альтернатива `def obj.method` — только без monkey patch.

---

### `.singleton_class`

```ruby
user = "Alice"
puts user.singleton_class  # => #<Class:#<String:0x...>>
```

Позволяет получить singleton-класс объекта как обычный Ruby-объект. Можно делать с ним что угодно:

```ruby
user.singleton_class.class_eval do
  def greet
    "Hi from singleton class"
  end
end

puts user.greet # => Hi from singleton class
```

---

## 📌 Как это работает на уровне `ancestors`?

```ruby
module M
  def greet
    "hello from M"
  end
end

obj = Object.new
obj.extend M

puts obj.singleton_class.ancestors.inspect
# => [M, #<Class:Object>, Class, Module, Object, Kernel, BasicObject]
```

**`extend`** подключает модуль в singleton-класс, а не в сам класс объекта.

---

## 🧠 Как отличить class methods от instance methods?

```ruby
class A
  def self.class_method; end
  def instance_method; end
end

A.singleton_methods       # => [:class_method]
A.new.singleton_methods   # => []
```

Метод, определённый через `def self.foo`, на самом деле — singleton-метод класса `A`.

---

## 🧨 Частый баг

```ruby
class A
  def greet
    "hi"
  end

  class << self
    def greet
      "hi from class"
    end
  end
end

A.greet        # => "hi from class"
A.new.greet    # => "hi"
```

**Вывод: `class << self` определяет методы у класса, а не у его экземпляров.**

---

## 📚 Иерархия — кто чей родитель?

```ruby
user = "Bob"

puts user.class                     # => String
puts user.singleton_class.superclass # => String
puts String.singleton_class.superclass # => Class
```

— У объекта singleton-класс → родитель — его обычный класс
— У класса singleton-класс → родитель — `Class`

---

## 💡 Где это реально используется?

* `def self.method` — sugar для `class << self`
* `extend SomeModule` — подключает методы в singleton-класс
* Метапаттерны: настройки, фабрики, конфигурации

---

🔚 **Вывод:**
Singleton-классы — как темные двойники объектов. Не видны напрямую, но отвечают за все "магические" методы. Главное — понимать: `class << self` — это ты открыл потайную дверь, и теперь в комнате можешь делать что угодно.
