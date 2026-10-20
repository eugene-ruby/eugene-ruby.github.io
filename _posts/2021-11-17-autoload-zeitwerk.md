---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: const_missing, autoload, Zeitwerk и просветление в require'
date: '2021-11-17 10:00:00 +0300'
categories:
- ruby
tags: Ruby,автозагрузка,require,load,Rails,Zeitwerk
rate: 3
hero_image: "/images/posts/background_post-0074.webp"
---
Разбираетесь, как Ruby загружает классы и модули? В этой статье мы детально разберём механизмы автозагрузки в Ruby — от базовых `require` и `load` до продвинутых техник вроде `const_missing` и современного `autoload_paths` в Rails. Вы узнаете, почему `require_relative` может быть опасен, как работает ленивая загрузка через `autoload`, и почему Zeitwerk стал золотым стандартом в Rails-приложениях. Мы ответим на частые вопросы разработчиков: «Почему Ruby не видит мой класс?», «Нужно ли писать require в Rails?» и «Как правильно организовать автозагрузку в больших проектах?» — с примерами кода и лучшими практиками.

---

## 🧱 Как Ruby находит классы

Обычно ты пишешь:

```ruby
require 'json'
puts JSON.parse("{}")
````

Ruby ищет файл `json.rb` или `json.so` в путях из `LOAD_PATH`.

---

## 🧨 `require` vs `require_relative`

* `require` ищет в глобальном `$LOAD_PATH`
* `require_relative` — от текущего файла

```ruby
require_relative '../lib/my_tool'
```

📌 `require_relative` быстрее и надёжнее в библиотеках и скриптах.

---

## 🧪 `autoload`: отложенная загрузка

```ruby
autoload :Foo, "foo"

# Класс Foo будет загружен **только при первом обращении**
Foo.new
```

Ruby отложит загрузку файла `foo.rb`, пока `Foo` реально не понадобится.
💡 Устаревает в пользу Zeitwerk (см. ниже).

---

## 🧠 `const_missing` — магия при поиске константы

```ruby
class Object
  def self.const_missing(name)
    puts "Ищу #{name}..."
    require name.to_s.downcase
    const_get(name)
  end
end

User.new  # => загружается user.rb
```

Работает в связке с `require`, но легко сломать всё (например, если в имени ошибка).

---

## 🚆 Zeitwerk: автозагрузчик в Rails

Начиная с Rails 6, `Zeitwerk` — это стандартный загрузчик:

* Использует `const_missing`
* Работает по правилам **convention over configuration**
* Требует соблюдения соглашений об именах и путях

```ruby
# app/models/user.rb
# содержит class User

User.new  # => автозагрузится
```

---

## 🧹 Требования Zeitwerk

1. **Имена классов и файлов должны совпадать**

   ```ruby
   class SuperBot  # => в super_bot.rb
   ```

2. **Модули и директории должны совпадать**

   ```ruby
   module Admin
     class Report  # => в admin/report.rb
   end
   ```

3. Не использовать `require` вручную внутри `app/`

---

## 📦 Как добавить свой путь в автозагрузку

```ruby
Rails.autoloaders.main.push_dir("#{Rails.root}/lib")
```

Или создать `lib/` с правильными путями и именами классов.

---

## 🧨 Вопрос с подвохом

```ruby
class App
  autoload :Config, "config"
end

App::Config  # Что произойдёт?
```

✅ Ruby попытается загрузить `config.rb`, определить `Config`, и всё будет работать.
💥 Если `config.rb` определяет `Configuration`, а не `Config` — `NameError`.

---

## 🚨 Почему нельзя просто `require 'user'` в Rails?

Потому что:

* Rails использует Zeitwerk
* Ты рискуешь загрузить **вручную**, нарушив lifecycle
* Проблемы при reload в dev-режиме

Используй `Rails.autoloaders`, а не `require`.

---

🔚 **Вывод:**
Ruby умеет находить классы, но только если ты не мешаешь.
Знай, что делает `const_missing`, зачем Zeitwerk, и почему `autoload` уже не торт. Это проверяют — потому что непонимание механики загрузки ведёт к `uninitialized constant`, `CircularDependencyError` и орущему проду.
