---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: method_missing, define_method и метапрограммирование без нервов'
short_description: Как создавать методы в Ruby через define_method, обрабатывать отсутствующие
  методы и константы и выбирать между send, public_send и eval. Разбираем рабочие
  примеры и ловушку с return.
date: '2023-03-22 16:00:00 +0300'
categories: []
tags:
- define_method
- eval
- Metaprogramming
- method_missing
rate: 4
hero_image: "/images/posts/background_post-0099.webp"
---
Ruby позволяет определять методы во время выполнения, перехватывать обращения к отсутствующим методам и константам и выполнять код в другом контексте. Разберём, когда эти приёмы полезны и где легко получить неожиданное поведение.

---

## 🕳 `method_missing` и `respond_to_missing?`

```ruby
class Ghost
  def method_missing(name, *args)
    return super unless name.to_s.start_with?("ghost_")

    "Ты звал: #{name} с #{args.inspect}"
  end

  def respond_to_missing?(name, include_private = false)
    name.to_s.start_with?("ghost_") || super
  end
end

g = Ghost.new
g.ghost_boo(1, 2)     # => "Ты звал: ghost_boo с [1, 2]"
g.respond_to?(:ghost_boo) # => true
```

`method_missing` должен передавать остальные вызовы в `super`: иначе опечатка в имени метода тоже превратится в успешный вызов. Если метод обрабатывает часть имён динамически, дополни его `respond_to_missing?`, чтобы `respond_to?` сообщал о них корректно.

---

## 🧬 `define_method`: динамически добавляем методы

```ruby
class User
  [:name, :email].each do |field|
    define_method("get_#{field}") do
      instance_variable_get("@#{field}")
    end
  end
end

u = User.new
u.instance_variable_set("@name", "Alice")
puts u.get_name  # => Alice
```

Так удобно создавать несколько однотипных методов. Если методы различаются поведением, явные определения обычно проще читать и искать в коде.

---

## 🧙‍♂️ `const_missing`: магия с константами

```ruby
module Demo
  def self.const_missing(name)
    puts "Не найдена константа: #{name}"
    super
  end
end

Demo::UnknownConst # напечатает сообщение, затем вызовет NameError
```

`const_missing` вызывается при обращении к отсутствующей константе в соответствующем пространстве имён. В примере `super` сохраняет обычное поведение для неизвестной константы. Если создавать константы на лету, важно явно определить, какие имена допустимы: иначе опечатка может незаметно создать новую константу.

---

## 🧼 `send`, `public_send` и `__send__`

```ruby
obj = "hello"
obj.send(:upcase)        # => "HELLO"
obj.public_send(:upcase) # => "HELLO"
obj.send(:puts, "hi")   # напечатает hi
```

Разница:

* `send` может вызывать в том числе приватные методы.
* `public_send` вызывает только публичные методы. Если имя метода приходит извне, одного этого ограничения недостаточно: допустимые имена всё равно стоит проверять.
* `__send__` тоже может вызывать приватные методы. Его удобно использовать, когда объект переопределяет `send`; это не механизм защиты.

---

## 📦 `eval`, `class_eval`, `instance_eval`, `module_eval`

```ruby
class Foo
  class_eval do
    def hello; "hi"; end
  end
end
```

| Метод | Что меняется в примере использования |
| --- | --- |
| `eval` | Выполняет строку кода; доступный контекст зависит от переданной привязки (`binding`) |
| `class_eval` | Выполняет блок или строку в контексте класса или модуля; внутри блока `self` — этот класс или модуль |
| `module_eval` | Другое имя для `class_eval` |
| `instance_eval` | Выполняет блок или строку в контексте объекта; внутри блока `self` — этот объект |

Для добавления методов часто достаточно блока с `class_eval` или `define_method`. Не передавай недоверенный ввод в строковый `eval`: это выполнение кода, а не безопасный разбор данных.

---

## 🧙‍♀️ Микро-DSL: создаём метод без method\_missing

```ruby
class Settings
  def self.option(name)
    define_method(name) { @config[name] }
  end

  def initialize(config)
    @config = config
  end

  option :theme
  option :timeout
end

settings = Settings.new(theme: "dark", timeout: 10)
settings.theme # => "dark"
```

Здесь методы создаются при определении класса, а не при каждом обращении к неизвестному имени. Если в `config` нет ключа, метод вернёт `nil`.

---

## 🤡 Подвох с `define_method` и return

```ruby
class Example
  def self.install
    define_method(:broken) do
      return "boom"
    end
  end

  install
end

Example.new.broken # => LocalJumpError
```

`return` внутри блока пытается выйти из метода `install`, в котором блок был создан. К моменту вызова `broken` метод `install` уже завершился, поэтому возникает `LocalJumpError`. Если нужно вернуть значение из динамически определённого метода, оставь его последним выражением блока:

```ruby
class Example
  define_method(:working) { "boom" }
end
```

---

## 🤯 Комбо-вопрос на собесе

**Что выведет код?**

```ruby
class A
  def self.const_missing(name)
    const_set(name, Class.new)
  end
end

puts A::User.new.class.name
```

**Ответ:** `A::User`.

**Объяснение:** при обращении к `A::User` вызывается `A.const_missing`. `const_set` присваивает созданному классу константу `User` внутри `A`, после чего `puts` выводит имя класса без кавычек.

---

🔚 **Вывод:** метапрограммирование помогает убрать повторяющийся код, но может скрыть поведение от читателя. Начинай с явных методов, а динамические приёмы используй там, где их польза оправдывает сложность.