---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: private_class_method, public_send, freeze и прочие меры предосторожности'
date: '2022-09-21 17:00:00 +0300'
categories:
- ruby
tags: Ruby,безопасность,приватные методы,защита данных,методы объектов,продакшен
rate: 3
hero_image: "/images/posts/background_post-0094.webp"
---
Ruby — это мощный и выразительный язык программирования, но без должного внимания к безопасности кода даже опытные разработчики могут столкнуться с уязвимостями и неожиданными ошибками. В этой статье мы подробно разберём ключевые механизмы защиты данных и методов в Ruby: от приватных методов и замороженных объектов до тонкостей работы с `send`, `freeze` и другими встроенными инструментами безопасности. Вы узнаете, как избежать распространённых ошибок, повысить надёжность кода в продакшене и подготовиться к сложным вопросам на собеседовании. Ruby даёт свободу, но с большой свободой приходит и большая ответственность — разберёмся, как правильно защитить методы, объекты и данные в ваших проектах.

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
````

Скрывает `new`, заставляя использовать `.build`, `.create`, `.call` и т.п.

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
puts s.send(:password)       # => 123456
puts s.public_send(:password) # 💥 NoMethodError
```

* `send` обходит приватность
* `public_send` — безопасный, не вызовет приватный метод

На собеседовании часто спрашивают: "Когда использовать `public_send`?"

---

## 🧊 `freeze` — защита от мутации

```ruby
str = "hello"
str.freeze

str << " world" # 💥 RuntimeError: can't modify frozen String
```

Любой вызов, который мутирует объект, вызовет исключение.

---

## 🧪 Разница между `dup` и `clone`

```ruby
obj = "hi".freeze

dup   = obj.dup
clone = obj.clone

puts dup.frozen?   # => false
puts clone.frozen? # => true
```

* `dup` делает неглубокую копию без флагов
* `clone` копирует объект **включая флаги** (`freeze`, singleton methods)

---

## 🧯 `frozen_string_literal: true`

Включи это в начало файла, и все строки в нём станут `frozen` по умолчанию:

```ruby
# frozen_string_literal: true

greeting = "hello"
greeting << " world"  # 💥 RuntimeError
```

Полезно для:

* производительности,
* предотвращения случайной мутации.

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

A.init  # ?
```

**Ответ:**
✅ Работает!
**Почему?**
`new` приватный **внутри класса** — но `self.init` вызывается **изнутри класса**, поэтому Ruby разрешает доступ.

---

🔚 **Вывод:**
Иногда Ruby напоминает йогу: мягкий, гибкий, но при этом можно вывернуться в узел. Умение контролировать доступ и мутации объектов — это зрелость. И это проверяют.
