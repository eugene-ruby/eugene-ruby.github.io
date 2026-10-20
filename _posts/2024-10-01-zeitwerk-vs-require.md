---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Zeitwerk против require: автоматическая загрузка без боли'
date: '2024-09-18 10:00:00 +0300'
categories:
- gems
- ruby
tags: Ruby,Zeitwerk,автозагрузка,require,классы,архитектура
rate: 3
hero_image: "/images/posts/background_post-0003.webp"
---
Помните те времена, когда каждый новый файл в Ruby-проекте требовал ручного `require`? Когда забытый `require_relative` вызывал `NameError` в самый неподходящий момент? А потом появился Zeitwerk — и всё изменилось. В этой статье разберём, как автоматическая загрузка классов эволюционировала от каменного века `require` до магии Zeitwerk, и почему теперь вы можете забыть про ручное подключение файлов (но не про архитектуру!).

---

## 🧠 Теория: от `require` к autoload

### Старая школа: ручное подключение

```ruby
# app/models/user.rb
require_relative "account"
require_relative "../lib/validators/email_validator"

class User
  # ...
end
```

**Проблемы:**
- **Хрупкость**: забыл `require` — получил ошибку.
- **Зависимости**: нужно знать точный путь до файла.
- **Производительность**: загружаем всё сразу, даже если не используем.

### Новый мир: autoload в Ruby

Ruby давно имеет встроенный `autoload`, но он:
- Требует явного указания констант (`autoload :User, "models/user"`).
- Не умеет в namespace'ы без костылей.
- Не поддерживает перезагрузку в development (актуально для Rails).

---

## 🚀 Zeitwerk: как это работает

Zeitwerk — это gem, который стал стандартом в Rails 6+. Он:
1. Сканирует директории.
2. Сопоставляет имена файлов с константами (`user.rb` → `User`, `users/admin.rb` → `Users::Admin`).
3. **Загружает классы по требованию**.

**Пример настройки:**

```ruby
# config/initializers/zeitwerk.rb
loader = Zeitwerk::Loader.new
loader.push_dir("app/models")
loader.push_dir("lib")
loader.setup # готово!
```

Теперь можно просто использовать классы — они подгрузятся автоматически:

```ruby
user = User.new # файл app/models/user.rb загрузится сам
```

---

## 🔥 Большие боли маленьких проектов

### 1. Конфликты именования

**Антипаттерн:**
```bash
app/
  models/
    user.rb
    user/
      admin.rb # Будет ли это User::Admin или UserAdmin?
```

**Решение:**
- Чётко соблюдать соглашение: `user/admin.rb` → `User::Admin`.
- Использовать `loader.collapse` для исключения префиксов:

```ruby
loader.collapse("app/models/user") # теперь user/admin.rb → UserAdmin
```

### 2. "Мёртвые" файлы

Zeitwerk проверяет **все** файлы при старте. Если в `app/models/` лежит `old_service.rb` без класса `OldService` — будет ошибка.  

**Фикс:**
- Удалить файл или добавить класс.
- Исключить директорию: `loader.ignore("app/legacy")`.

### 3. Проблемы с STI (Single Table Inheritance)

```ruby
# app/models/vehicle.rb
class Vehicle < ApplicationRecord
end

# app/models/vehicle/car.rb
class Vehicle::Car < Vehicle # Ошибка: Vehicle не определен!
end
```

**Решение:**
- Явно require родительский класс:

```ruby
# app/models/vehicle/car.rb
require "vehicle"

class Vehicle::Car < Vehicle
end
```

---

## 🧪 Тестирование с Zeitwerk

### RSpec + Zeitwerk = ❤️

```ruby
# spec/spec_helper.rb
require "zeitwerk"
loader = Zeitwerk::Loader.new
loader.push_dir("app")
loader.setup
```

**Но!** Не забывайте:
- Тесты теперь зависят от структуры файлов.
- Избегайте `require_relative` в тестах — это ломает логику автозагрузки.

---

## ⚡ Производительность: мифы и реальность

**Миф**: "Zeitwerk медленнее, потому что проверяет все файлы".  
**Реальность**:
- В development — да, идёт сканирование при каждом изменении.
- В production — нет, пути кешируются после первого запуска.

**Совет**: Для больших проектов (500+ моделей) можно:
```ruby
loader.do_not_eager_load("app/models/concerns") # отложить загрузку
```

---

## 🎤 Что сказать на собеседовании

> — Как вы организуете автозагрузку кода в Rails?

— Мы используем Zeitwerk, который стал стандартом в Rails 6+. Он позволяет забыть про ручные `require`, следуя соглашению "имя файла = имя класса". Для кастомных сценариев настраиваем через `collapse`/`ignore`, а в тестах проверяем, что все файлы соответствуют ожидаемой структуре.

---

## 🧾 Вывод

**Zeitwerk — это как автопилот для загрузки классов.**  
Больше не нужно:
- Писать `require` в каждом втором файле.
- Ручками отслеживать зависимости.
- Бояться `NameError` из-за опечаток в путях.

Но помните: **магия — это не архитектура**. Zeitwerk не избавляет от необходимости продумывать структуру проекта, а лишь делает её поддержку менее болезненной.

*P.S. Если ваш проект всё ещё на `require_relative` — время для апгрейда! Миграция обычно занимает 1-2 дня даже для больших кодовых баз.*
