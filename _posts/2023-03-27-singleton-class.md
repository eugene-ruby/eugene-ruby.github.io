---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: class << self и singleton-классы — что это за магия?'
short_description: 'Как Ruby хранит методы отдельного объекта и методы класса: разбираем
  class << self, define_singleton_method, extend и цепочку поиска методов.'
date: '2023-03-27 15:00:00 +0300'
categories:
- development
tags:
- Class Methods
- Dynamic Dispatch
- extend
- Inheritance
- Metaprogramming
- Object Model
- Singleton Class
rate: 4
hero_image: "/images/posts/background_post-0075.webp"
---
Singleton-классы в Ruby позволяют определять методы для отдельного объекта, не добавляя их всем экземплярам его класса. Через них работают методы классов и `extend`. Разберём, как это связано с `class << self` и цепочкой поиска методов.

---

## 🧬 Что такое singleton-класс?

У объекта Ruby может быть **singleton-класс**, в котором определяются его собственные методы — их также называют singleton-методами. Такие методы есть только у этого объекта, а не у всех экземпляров его обычного класса.

```ruby
str = "hi"

def str.shout
  upcase + "!"
end

puts str.shout # => "HI!"
```

Метод `shout` есть **только у `str`**, не у других строк. Он определяется в singleton-классе этого объекта. Не для каждого объекта можно определить singleton-метод: например, Ruby не позволяет делать это для целых чисел и символов.

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

**`class << self`** открывает singleton-класс текущего объекта (здесь — класса `User`). Методы, объявленные внутри этого блока, становятся методами `User`, а не экземпляров `User`.

---

### `define_singleton_method`

```ruby
robot = Object.new

robot.define_singleton_method(:greet) do
  "👋 Здравствуй, человек!"
end

puts robot.greet # => 👋 Здравствуй, человек!
```

Это способ определить метод у отдельного объекта программно, без изменения его обычного класса. В отличие от `def robot.greet`, имя метода можно передать в `define_singleton_method` как значение.

---

### `.singleton_class`

```ruby
user = "Alice"
puts user.singleton_class  # => #<Class:#<String:0x...>>
```

Возвращает singleton-класс объекта. С ним можно работать как с объектом класса, например определить метод:

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
# => [#<Class:#<Object:0x...>>, M, Object, Kernel, BasicObject]
```

**`extend`** подключает модуль к singleton-классу объекта, а не к его обычному классу. Поэтому `M` появляется после singleton-класса в цепочке поиска методов. Адрес объекта в выводе будет отличаться.

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

Метод, определённый через `def self.foo` в теле класса, — singleton-метод объекта `A`. Метод, определённый через `def instance_method`, доступен экземплярам `A`.

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

Здесь два разных метода с одним именем. Если ожидать, что метод из `class << self` появится у `A.new`, вызов `A.new.greet` даст не тот результат, на который рассчитывали. Проверяйте, где объявлен метод: в теле класса для экземпляров или в singleton-классе самого `A`.

---

## 📚 Иерархия — кто чей родитель?

```ruby
user = "Bob"

puts user.class                        # => String
puts user.singleton_class.superclass   # => String
puts String.singleton_class.superclass # => #<Class:Object>
```

У обычного объекта родитель его singleton-класса — обычный класс объекта. У класса это устроено иначе: singleton-класс `String` наследуется от singleton-класса `Object`, поскольку `String` наследуется от `Object`. Не путайте `superclass` с `class`: объект `String.singleton_class` сам является экземпляром `Class`.

---

## 💡 Где это реально используется?

* `def self.method` — способ объявить один метод класса; `class << self` удобен, когда таких методов несколько.
* `extend SomeModule` — подключает методы модуля к отдельному объекту через его singleton-класс.
* Настройки и фабрики — случаи, когда метод нужен конкретному объекту или классу, а не всем экземплярам его обычного класса.

---

**Вывод:** singleton-класс помогает понять, где Ruby ищет методы отдельного объекта и почему методы класса не становятся методами его экземпляров. `class << self` открывает этот класс для определения методов.