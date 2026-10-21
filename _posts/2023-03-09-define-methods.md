---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: define_method против define_singleton_method — метапрограммируй, но
  не колдуй'
short_description: 'Чем отличаются define_method и define_singleton_method в Ruby:
  где появляются созданные методы, как сделать метод класса и каких ошибок избегать.'
date: '2023-03-09 11:00:00 +0300'
categories:
- ruby
tags: Ruby,метапрограммирование,define_method,define_singleton_method,DRY,Rails
rate: 3
hero_image: "/images/posts/background_post-0013.webp"
---
Ruby позволяет создавать методы во время выполнения. Разберём, чем отличаются `define_method` и `define_singleton_method`, где окажется созданный метод и какие ошибки легко допустить.

---

Метапрограммирование — это когда ты создаёшь методы, пока никто не видит. На собеседованиях любят спрашивать: «А в чём разница?» — и смотрят, как ты вспоминаешь статью вроде этой.

## 🏷 define_method

Добавляет **метод экземпляра в класс или модуль**.

```ruby
class Robot
  define_method(:greet) do |name|
    "Hello, #{name}!"
  end
end

puts Robot.new.greet("Ruby") # => Hello, Ruby!
```

💡 Метод определяется в классе, но вызывается на его экземплярах. Если определить его в модуле, он станет доступен экземплярам классов, в которые включён модуль.

---

## 🧍 define\_singleton\_method

Добавляет метод **конкретному объекту** — в его singleton-класс.

```ruby
robot = Object.new

robot.define_singleton_method(:greet) do
  "I'm unique!"
end

puts robot.greet # => I'm unique!
```

💡 Здесь `greet` доступен объекту `robot`, но не другим экземплярам `Object`.

---

## 🧠 Ключевые отличия

|                        | define\_method                         | define\_singleton\_method            |
| ---------------------- | -------------------------------------- | ------------------------------------- |
| Где определяет метод   | В классе или модуле                    | В singleton-классе объекта            |
| Где вызывается         | На экземплярах класса                  | На объекте, которому добавлен метод   |
| Как создать метод класса | Вызвать внутри `class << self`       | Вызвать на объекте класса             |
| `self` при вызове       | Экземпляр                              | Объект, которому добавлен метод       |

---

## 🧨 Подводные камни

1. Блок с `return`, созданный внутри метода-генератора и переданный в `define_method`, может попытаться выйти из уже завершившегося метода. Тогда при вызове динамического метода возникнет `LocalJumpError`. Если нужно просто вернуть значение, обычно достаточно последнего выражения блока.
2. `define_method` принимает блок или объект `Proc`/`Method`, а не определение `def` в качестве аргумента.
3. Класс сам является объектом. Если вызвать `define_singleton_method` на классе, получится метод класса — не метод его экземпляров.

```ruby
class Robot
  define_singleton_method(:greet) { "Hello" }
end

Robot.greet # => "Hello"
```

---

## 🎓 Примеры использования

### define\_method — генерация DRY-методов

```ruby
class Book
  def initialize(title, author, year)
    @title = title
    @author = author
    @year = year
  end

  [:title, :author, :year].each do |field|
    define_method("get_#{field}") do
      instance_variable_get("@#{field}")
    end
  end
end

Book.new("Ruby", "Автор", 2000).get_title # => "Ruby"
```

Здесь методы создаются по списку полей. Если нужны лишь обычные методы чтения без динамических имён, проще использовать `attr_reader`.

### define\_singleton\_method — конфигурация на лету

```ruby
config = {}

config.define_singleton_method(:set) do |key, value|
  self[key] = value
end

config.set(:theme, :dark)
```

Метод `set` появился только у этого хеша. Если он нужен всем хешам, такое решение не подойдёт.

---

## 🔧 Для классов тоже можно

```ruby
class Robot
end

class << Robot
  define_method(:greet) { "hi" }
end

Robot.greet # => "hi"
```

Это тоже создаёт **метод класса**: `class << Robot` открывает singleton-класс объекта `Robot`, а `define_method` определяет в нём метод экземпляра. Внутри тела `class Robot` тот же объект можно обозначить через `self` и написать `class << self`.

---

🔚 **Вывод:**
`define_method` определяет метод в классе или модуле, а `define_singleton_method` — у конкретного объекта. Для метода класса подходят оба приёма, если учитывать, где именно выполняется `define_method`.

*Следующая тема: переменные класса, экземпляра и глобальные — да начнётся хаос с `@`, `@@` и `$`.*