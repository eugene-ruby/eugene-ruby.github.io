---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Методы eval и exec в Ruby: когда обычного ООП уже недостаточно'
date: '2025-04-23 11:00:00 +0300'
categories:
- ruby
tags: Ruby,метапрограммирование,классы,модули,рефлексия
rate: 4
hero_image: "/images/posts/background_post-0086.webp"
---
Методы `eval` и `exec` в Ruby — это мощные инструменты метапрограммирования, позволяющие динамически изменять классы, модули и объекты во время выполнения программы. В статье разберём их различия, практические применения и подводные камни, которые могут превратить ваш код в минное поле.

---
Вы когда-нибудь видели код, который "сам себя пишет"?  
В Ruby это не магия, а обычный будничный инструмент — **методы семейства `eval` и `exec`**.

---

## 🧠 Теория: зачем это нужно?

Иногда статического ООП недостаточно. Например:
- Нужно добавить методы в класс динамически (например, из конфига)
- Требуется модифицировать поведение объекта "на лету"
- Хочется создать DSL (Domain-Specific Language)

Вот где на помощь приходят наши "волшебные" методы.

---

## 🔧 Основные различия

| Метод          | Контекст выполнения | Блок/строка | Аргументы |
|----------------|---------------------|-------------|-----------|
| `class_eval`   | Класс/модуль        | Оба         | Нет       |
| `module_eval`  | Класс/модуль        | Оба         | Нет       |
| `instance_eval`| Экземпляр           | Оба         | Нет       |
| `class_exec`   | Класс/модуль        | Только блок | Да        |
| `module_exec`  | Класс/модуль        | Только блок | Да        |
| `instance_exec`| Экземпляр           | Только блок | Да        |

---

## 1️⃣ class_eval / module_eval (это одно и то же!)

**Что делает:** Открывает класс/модуль для добавления методов.

```ruby
class User; end

User.class_eval do
  def say_hello
    "Hello from class_eval!"
  end
end

User.new.say_hello # => "Hello from class_eval!"
```

**Жизненный пример:** Динамическое добавление методов из YAML-конфига.

```ruby
# config/methods.yml
# methods:
#   admin:
#     - name: ban_user
#       body: "self.banned = true"

methods_config = YAML.load_file('config/methods.yml')
methods_config['methods']['admin'].each do |method|
  Admin.class_eval <<~RUBY
    def #{method['name']}
      #{method['body']}
    end
  RUBY
end
```

**Антипаттерн:** Использовать для простого добавления методов — лучше `include` модуля.

---

## 2️⃣ instance_eval

**Что делает:** Меняет `self` на конкретный объект.

```ruby
user = User.new
user.instance_eval do
  def personal_method
    "Only for this instance!"
  end
end

user.personal_method # => "Only for this instance!"
User.new.personal_method # NoMethodError
```

**Жизненный пример:** Создание тестовых данных с уникальным поведением.

```ruby
test_user = User.new
test_user.instance_eval do
  def admin?
    true # В тестах этот пользователь всегда админ
  end
end
```

**Антипаттерн:** Злоупотребление — может сделать код непредсказуемым.

---

## 3️⃣ class_exec / module_exec

**Что делает:** Как `class_eval`, но с поддержкой параметров в блоке.

```ruby
module Logger
   def self.add_logging(method_name)
      class_exec(method_name) do |name|
         define_method(name) do |*args|
            puts "Calling #{name} with #{args}"
            super(*args)
         end
      end
   end
end

class Calculator
   prepend Logger
  def add(a, b); a + b; end
end

Logger.add_logging(:add)
Calculator.new.add(2, 3) # => "Calling add with [2, 3]"
                         # => 5
```

**Жизненный пример:** Паттерн "Декоратор" для добавления логирования.

---

## 4️⃣ instance_exec

**Что делает:** То же, что `instance_eval`, но с поддержкой параметров в блоке.

```ruby
class Button
   def initialize
      @state = 'off'
   end

   def update_state(new_state)
      instance_exec(new_state) do |state|
         @state = state
      end
   end

   def state
      @state
   end
end

button = Button.new
puts button.state # => "off"
button.update_state('on')
puts button.state # => "on"
```

**Практическое применение:** Колбэки в UI-библиотеках.

---

## 💣 Опасности и подводные камни

1. **Безопасность:** Никогда не используйте `eval` с пользовательским вводом:
   ```ruby
   # ОПАСНО!
   User.class_eval(params[:code])
   ```

2. **Производительность:** Динамическое создание методов медленнее статического.

3. **Отладка:** Сложнее отслеживать происхождение динамически созданных методов.

---

## 🎤 Что сказать на собеседовании

> — Как вы относитесь к метапрограммированию в Ruby?

— Это мощный инструмент, но как нож — хорош в умелых руках. Я использую `class_eval`/`define_method` там, где это оправдано, например для создания DSL или динамических делегатов, но всегда помню о безопасности и читаемости кода.

---

## 🧾 Вывод

**Методы `eval` и `exec` — это швейцарский нож Ruby-разработчика.**  
Они позволяют писать выразительный и гибкий код, но требуют дисциплины. Используйте их осознанно, когда обычное ООП не справляется, и всегда помните о безопасности и поддерживаемости кода.
