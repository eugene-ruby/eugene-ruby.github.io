---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: private_class_method, public_send, freeze и прочие меры предосторожности'
short_description: 'Как в Ruby ограничить вызов методов и избежать случайной мутации
  объектов: разбираем private_class_method, public_send, freeze, копирование строк
  и приватный initialize.'
date: '2022-09-21 17:00:00 +0300'
categories:
- development
tags:
- Class Methods
- Method Visibility
- Object Freezing
- send
rate: 3
hero_image: "/images/posts/background_post-0094.webp"
---
В Ruby можно ограничить прямой вызов метода или запретить изменение объекта. Но у этих механизмов разные задачи: приватность метода не защищает секреты, а `freeze` не замораживает всё, на что объект ссылается. Разберём примеры и границы их применения.

---

## 🚪 `private_class_method`

```ruby
class Service
  def self.new
    puts "Конструктор вызван"
    super
  end

  private_class_method :new
end

Service.new  # 💥 NoMethodError: private method `new`
```

`private_class_method :new` запрещает прямой вызов `Service.new`. Так можно оставить создание объекта публичному фабричному методу, например `.build` или `.create`; в этом примере фабрика не определена. Это ограничение обычного интерфейса, а не защита от кода, который намеренно обходит приватность через `send`.

---

## 🔑 `send` vs `public_send`

```ruby
class Secret
  def initialize; end

  private

  def password
    "123456"
  end
end

s = Secret.new
puts s.send(:password)        # => 123456
puts s.public_send(:password) # 💥 NoMethodError
```

* `send` может вызвать и приватный метод.
* `public_send` вызывает только публичные методы.

Если имя метода приходит извне и нужен вызов только публичного API, выбирайте `public_send`. Но он не делает произвольное имя метода безопасным: если доступен лишь ограниченный набор действий, проверяйте имя по списку разрешённых методов. На собеседовании часто спрашивают: «Когда использовать `public_send`?»

---

## 🧊 `freeze` — защита от мутации

```ruby
str = "hello"
str.freeze

str << " world" # 💥 FrozenError: can't modify frozen String
```

`freeze` запрещает менять сам объект. Попытка добавить символы к замороженной строке вызовет `FrozenError`. Заморозка неглубокая: если объект содержит ссылки на другие изменяемые объекты, их всё ещё можно менять.

---

## 🧪 Разница между `dup` и `clone`

```ruby
obj = "hi".freeze

dup   = obj.dup
clone = obj.clone

puts dup.frozen?   # => false
puts clone.frozen? # => true
```

* `dup` делает неглубокую копию; заморозка исходного объекта на неё не переносится.
* `clone` тоже копирует неглубоко, но по умолчанию сохраняет состояние `frozen?` и singleton methods.

Ни один из методов не создаёт глубокую копию вложенных объектов.

---

## 🧯 `frozen_string_literal: true`

Добавьте комментарий в начало файла, чтобы строковые литералы в нём были заморожены:

```ruby
# frozen_string_literal: true

greeting = "hello"
greeting << " world"  # 💥 FrozenError
```

Это помогает обнаруживать случайную мутацию строковых литералов. Комментарий не замораживает все строки в программе, в том числе строки, созданные во время выполнения. Если литерал нужно менять, сначала создайте изменяемую копию, например через `dup`.

---

## 🧙‍♂️ Пример паттерна `.call` вместо `.new`

```ruby
class Report
  def self.call(...)
    new(...).call
  end

  private_class_method :new

  def call
    "Генерирую отчёт..."
  end
end

puts Report.call # => Генерирую отчёт...
```

Здесь `Report.call` остаётся публичной точкой входа, а `Report.new` нельзя вызвать напрямую. Внутри метода класса вызов `new(...)` без явного получателя допустим, несмотря на его приватность.

---

## 🧨 Вопрос с подвохом

```ruby
class A
  def self.init
    new
  end

  private

  def initialize
    puts "Приватный инит"
  end
end

A.init  # => Приватный инит
```

**Почему это работает?** `initialize` — приватный метод экземпляра, но `new` здесь остаётся публичным методом класса. При создании объекта `new` вызывает `initialize`; приватность `initialize` не запрещает ни `A.init`, ни прямой вызов `A.new`. Если нужно ограничить именно прямой вызов `new`, используйте `private_class_method :new`, как в примере с `Report`.

---

**Вывод:** `private_class_method` помогает управлять интерфейсом класса, `public_send` учитывает видимость метода, а `freeze` защищает конкретный объект от изменений. Ни один из этих инструментов сам по себе не заменяет проверку недоверенного ввода или защиту данных.