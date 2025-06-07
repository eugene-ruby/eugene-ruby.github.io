---
layout: post
title:  "Ruby: method_missing, define_method и метапрограммирование без нервов"
date:   2023-03-22 16:00:00 +0300
rate: 4
tags: Ruby,метапрограммирование,method_missing,define_method,eval,Rails
version: A49X3
categories:
  - ruby
toc: true
menubar_toc: true
hero_image: /images/ruby.jpeg
hero_darken: true
---
Ruby — это не просто язык, а целый набор инструментов для метапрограммирования, позволяющий коду создавать код. В этой статье разберём ключевые методы вроде `method_missing`, `define_method` и `eval`, а также их безопасные альтернативы в Rails и других фреймворках.

---

## 🕳 `method_missing` и `respond_to_missing?`

```ruby
class Ghost
  def method_missing(name, *args)
    "Ты звал: #{name} с #{args.inspect}"
  end

  def respond_to_missing?(name, include_private = false)
    name.to_s.start_with?("ghost_")
  end
end

g = Ghost.new
g.ghost_boo(1, 2)   # => "Ты звал: ghost_boo с [1, 2]"
````

💡 Обязательно дополняй `method_missing` методом `respond_to_missing?` — иначе `respond_to?` будет вести себя некорректно.

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

**Плюсы:**

* DRY.
* Красиво, если не перебор.

---

## 🧙‍♂️ `const_missing`: магия с константами

```ruby
class Kernel
  def self.const_missing(name)
    puts "Не найдена константа: #{name}"
    super
  end
end

UnknownConst # => Не найдена константа: UnknownConst
```

Используется, например, в автозагрузке классов.

---

## 🧼 `send`, `public_send` и `__send__`

```ruby
obj = "hello"
obj.send(:upcase)       # => "HELLO"
obj.public_send(:upcase) # => "HELLO"
obj.send(:puts, "hi")   # => hi
```

Разница:

* `send` вызывает даже приватные методы
* `public_send` — только публичные
* `__send__` — безопасный синоним, если метод `send` переопределён в объекте

---

## 📦 `eval`, `class_eval`, `instance_eval`, `module_eval`

```ruby
class Foo
  class_eval do
    def hello; "hi"; end
  end
end
```

| Метод           | Контекст             | self внутри          |
| --------------- | -------------------- | -------------------- |
| `eval`          | глобальный / текущий | текущий              |
| `class_eval`    | модуль/класс         | модуль (self=модуль) |
| `instance_eval` | объект               | объект               |

🧨 Используй только если точно понимаешь, что делаешь. Иначе — баги, дыры и грусть.

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
```

---

## 🤡 Подвох с `define_method` и return

```ruby
define_method(:broken) do
  return "boom"  # 💥 LocalJumpError, если метод вызван в другом контексте
end
```

**Почему?**
Потому что `return` в `define_method` не всегда может "вернуться", особенно если ты используешь его из контекста `class_eval`.

---

## 🤯 Комбо-вопрос на собесе

**Что выведет код:**

```ruby
class A
  def self.const_missing(name)
    const_set(name, Class.new)
  end
end

puts A::User.new.class.name
```

**Ответ:** `"A::User"`
**Объяснение:** при первом вызове `A::User`, класс создаётся на лету через `const_missing`.

---

🔚 **Вывод:**
Метапрограммирование — мощный инструмент, который должен идти с предупреждением: “Использовать с умом”. На собеседовании — покажи знание, но на проде — выбирай явность.
