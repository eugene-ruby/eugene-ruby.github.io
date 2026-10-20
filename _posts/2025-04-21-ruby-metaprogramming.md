---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Метапрограммирование в Ruby: магия, которую стоит освоить'
date: '2025-04-21 12:00:00 +0300'
categories:
- ruby
tags: Ruby, метапрограммирование, ООП, рефлексия
rate: 4
hero_image: "/images/posts/background_post-0051.webp"
---
Метапрограммирование — это возможность писать **код, который изменяет поведение другого кода на лету**. Ruby — один из тех языков, где такие техники встроены в саму философию языка.

В этой серии разберём ключевые инструменты, которые Ruby предоставляет для метапрограммирования, с примерами и практическими кейсами.

---

## 📚 Основные темы

---

### [📞 Вызов методов динамически](/posts/ruby-metaprogramming-send.html)

- `send`
- `__send__`
- `public_send`

Эти методы позволяют вызывать методы по имени, которое хранится в переменной, даже если метод приватный.

---

### [🔍 Информация о методах](/posts/ruby-metaprogramming-respond-to.html)

- `method`
- `respond_to?`
- `respond_to_missing?`
- `method_defined?`
- `instance_methods`
- `singleton_methods`

Как проверить, есть ли метод, получить ссылку на него или узнать, кто что умеет.

---

### [🧑‍🎓 Работа с классами и модулями](/posts/ruby-metaprogramming-class-eval.html)

- `class_eval`
- `module_eval`
- `instance_eval`
- `class_exec`
- `module_exec`
- `instance_exec`

Создание и изменение методов, настройка поведения классов и модулей в рантайме.

---

### [🪄 Создание хуков](/posts/ruby-metaprogramming-hooks.html)

- `method_missing`
- `define_singleton_method`

Перехват вызовов несуществующих методов и динамическое создание методов.

---

### [📦 Работа с константами и переменными](/posts/ruby-metaprogramming-const.html)

- `const_get`, `const_set`, `const_defined?`, `remove_const`
- `instance_variable_get`, `instance_variable_set`, `instance_variables`
- `class_variable_get`, `class_variable_set`, `class_variables`

Доступ и изменение переменных и констант внутри объектов и классов.

---

### [🔗 Работа с наследованием и цепочкой классов](/posts/ruby-metaprogramming-ancestors.html)

- `included`, `extended`, `prepended`
- `superclass`, `ancestors`

Анализ цепочек наследования и подключение модулей.

---

### [🧑‍🏫 Специальные методы](/posts/ruby-metaprogramming-method-added.html)

- `method_added`, `singleton_method_added`
- `method_removed`, `singleton_method_removed`
- `method_undefined`, `singleton_method_undefined`

Специальные хуки, которые срабатывают при добавлении, удалении или изменении методов.

---

### [🪢 Системные](/posts/ruby-metaprogramming-eval.html)

- `eval`
- `binding`
- `Kernel#tap`

Выполнение динамического кода и управление контекстом исполнения.

---

## ⚙️ Когда это применять

Метапрограммирование полезно:
- для построения **DSL** (например, ActiveRecord или RSpec)
- при создании **фреймворков и библиотек**
- для уменьшения повторяющегося кода (**DRY**)
- в случаях, когда обычные средства ООП не дают нужной гибкости

⚠️ **Внимание:** Метапрограммирование может усложнить отладку, ухудшить читаемость и привести к ошибкам в рантайме. Используйте его осознанно.
