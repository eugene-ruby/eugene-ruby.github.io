---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Метапрограммирование в Ruby: магия, которую стоит освоить'
short_description: 'Обзор инструментов метапрограммирования в Ruby: как вызывать и
  определять методы динамически, исследовать классы и использовать хуки. Со ссылками
  на подробные разборы и оговорками о применении.'
date: '2025-04-21 12:00:00 +0300'
categories:
- ruby
tags: Ruby, метапрограммирование, ООП, рефлексия
rate: 4
hero_image: "/images/posts/background_post-0051.webp"
---
Метапрограммирование позволяет программе исследовать и изменять собственную структуру во время выполнения: например, узнавать о доступных методах или определять новые. В Ruby для этого есть встроенные инструменты.

В этой серии разберём ключевые инструменты метапрограммирования в Ruby — с примерами и практическими кейсами.

---

## 📚 Основные темы

---

### [📞 Вызов методов динамически](/posts/ruby-metaprogramming-send.html)

- `send`
- `__send__`
- `public_send`

Эти методы позволяют вызвать метод по имени, которое хранится в переменной. `send` и `__send__` могут вызвать в том числе приватный метод, а `public_send` — только публичный.

---

### [🔍 Информация о методах](/posts/ruby-metaprogramming-respond-to.html)

- `method`
- `respond_to?`
- `respond_to_missing?`
- `method_defined?`
- `instance_methods`
- `singleton_methods`

Как проверить наличие метода, получить объект метода и изучить методы объекта, класса или модуля.

---

### [🧑‍🎓 Работа с классами и модулями](/posts/ruby-metaprogramming-class-eval.html)

- `class_eval`
- `module_eval`
- `instance_eval`
- `class_exec`
- `module_exec`
- `instance_exec`

Определение методов и настройка поведения классов, модулей и объектов во время выполнения.

---

### [🪄 Создание хуков](/posts/ruby-metaprogramming-hooks.html)

- `method_missing`
- `define_singleton_method`

`method_missing` позволяет обработать вызов метода, который Ruby не нашёл; `define_singleton_method` — определить метод для конкретного объекта. Если `method_missing` обеспечивает динамический отклик на имя метода, его обычно дополняют `respond_to_missing?`, чтобы проверка через `respond_to?` работала согласованно.

---

### [📦 Работа с константами и переменными](/posts/ruby-metaprogramming-const.html)

- `const_get`, `const_set`, `const_defined?`, `remove_const`
- `instance_variable_get`, `instance_variable_set`, `instance_variables`
- `class_variable_get`, `class_variable_set`, `class_variables`

Доступ к константам, переменным экземпляра и переменным класса и изменение их значений.

---

### [🔗 Работа с наследованием и цепочкой классов](/posts/ruby-metaprogramming-ancestors.html)

- `included`, `extended`, `prepended`
- `superclass`, `ancestors`

`superclass` и `ancestors` помогают изучить наследование и цепочку поиска методов. `included`, `extended` и `prepended` — хуки, вызываемые при подключении модуля соответствующим способом.

---

### [🧑‍🏫 Специальные методы](/posts/ruby-metaprogramming-method-added.html)

- `method_added`, `singleton_method_added`
- `method_removed`, `singleton_method_removed`
- `method_undefined`, `singleton_method_undefined`

Хуки, которые срабатывают при добавлении, удалении методов или запрете их наследования через `undef_method`.

---

### [🪢 Системные](/posts/ruby-metaprogramming-eval.html)

- `eval`
- `binding`
- `Kernel#tap`

`eval` выполняет код из строки, а `binding` сохраняет контекст, который можно передать в `eval`. `tap` передаёт объект в блок и возвращает тот же объект — он полезен для промежуточных действий в цепочке вызовов, но сам по себе не выполняет динамический код.

---

## ⚙️ Когда это применять

Метапрограммирование полезно:
- для построения **DSL** (например, ActiveRecord или RSpec)
- при создании **фреймворков и библиотек**
- для уменьшения повторяющегося кода (**DRY**), если шаблон действительно проще выразить динамически
- в случаях, когда обычные средства ООП не дают нужной гибкости

⚠️ **Внимание:** Метапрограммирование может усложнить отладку, ухудшить читаемость и привести к ошибкам во время выполнения. Используйте его там, где польза от динамического поведения оправдывает эту сложность.