---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: define_method против define_singleton_method — метапрограммируй, но
  не колдуй'
date: '2023-03-09 11:00:00 +0300'
categories:
- ruby
tags: Ruby,метапрограммирование,define_method,define_singleton_method,DRY,Rails
rate: 3
hero_image: "/images/posts/background_post-0013.webp"
---
Ruby предлагает мощные инструменты метапрограммирования, такие как define_method и define_singleton_method, которые позволяют динамически создавать методы во время выполнения. В этой статье разберём ключевые различия между ними, типичные ошибки и практические примеры использования в Rails-приложениях. Вы узнаете, как правильно применять эти методы для DRY-кода и гибкой настройки объектов.

---

Метапрограммирование — это когда ты создаёшь методы, пока никто не видит. Ruby позволяет делать это двумя способами: `define_method` и `define_singleton_method`. На собеседованиях любят спрашивать: “А в чём разница?” — и смотрят, как ты вспоминаешь статью вроде этой.

## 🏷 define_method

Добавляет **инстанс-метод в класс или модуль**.

```ruby
class Robot
  define_method(:greet) do |name|
    "Hello, #{name}!"
  end
end

puts Robot.new.greet("Ruby") # => Hello, Ruby!
````

💡 Важно: метод определяется **на уровне класса**, но работает **на экземплярах**.

---

## 🧍 define\_singleton\_method

Добавляет метод только **одному конкретному объекту** — его singleton-методу.

```ruby
robot = Object.new

robot.define_singleton_method(:greet) do
  "I'm unique!"
end

puts robot.greet # => I'm unique!
```

💡 Этот метод нельзя вызвать на уровне `class`, только на объекте.

---

## 🧠 Ключевые отличия

|                        | define\_method       | define\_singleton\_method    |
| ---------------------- | -------------------- | ---------------------------- |
| Где определяет метод   | В классе/модуле      | В singleton-классе объекта   |
| Работает на…           | Экземплярах класса   | Только на данном объекте     |
| Может ли быть у класса | Да (`class << self`) | Да (если вызвать на объекте) |
| Контекст `self`        | Экземпляр при вызове | Тот самый объект             |

---

## 🧨 Подводные камни

1. `define_method` не принимает `return` в блоке — будет `LocalJumpError`.
2. Нельзя использовать обычные `def` внутри `define_method` — только блок.
3. При попытке вызвать `define_singleton_method` в теле класса: 💥 `NoMethodError`.

---

## 🎓 Примеры использования

### define\_method — генерация DRY-методов

```ruby
[:title, :author, :year].each do |field|
  define_method("get_#{field}") do
    instance_variable_get("@#{field}")
  end
end
```

### define\_singleton\_method — конфигурация на лету

```ruby
config = {}

config.define_singleton_method(:set) do |key, value|
  self[key] = value
end

config.set(:theme, :dark)
```

---

## 🔧 Для классов тоже можно

```ruby
class << MyClass
  define_method(:greet) { "hi" }
end
```

Это добавит **метод класса**, потому что `class << self` открывает singleton class.

---

🔚 **Вывод:**
`define_method` — это про шаблоны и автоматизацию. `define_singleton_method` — про кастомную магию. Оба мощные. Оба опасны в руках у разработчика без кофеина.

*Следующая тема: переменные класса, экземпляра и глобальные — да начнётся хаос с `@`, `@@` и `$`.*
