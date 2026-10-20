---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: "\U0001F4E6 Работа с константами и переменными в Ruby: метапрограммирование
  без боли"
date: '2025-04-25 12:00:00 +0300'
categories:
- ruby
tags: Ruby,метапрограммирование,константы,переменные,рефлексия
rate: 4
hero_image: "/images/posts/background_post-0012.webp"
---
Константы и переменные в Ruby — это не просто хранилища данных, а полноценные инструменты метапрограммирования. В статье разберём методы для работы с ними, их подводные камни и реальные кейсы применения — от динамического создания классов до хитрых фиксов legacy-кода.

---

## 🔍 Введение: зачем это нужно?

Представьте: вы открываете старый проект, а там...
```ruby
class Magic
  KLASS = case ENV['MODE']
          when 'prod' then ProductionSpell
          when 'test' then TestSpell
          else DebugSpell
          end
end
```
И нужно это как-то тестировать, менять или вообще удалять. Вот тут-то и пригодятся методы работы с константами!

---

# 📌 Константы: динамический доступ

## `const_get` / `const_set` — читаем и пишем константы

**Теория**:  
Эти методы позволяют получать и устанавливать константы **по строковому имени**.

**Пример**: Динамическое создание классов для плагинов:
```ruby
# Загружаем все плагины из папки
Dir['plugins/*.rb'].each do |file|
  plugin_name = File.basename(file, '.rb').camelize
  klass = Object.const_set(plugin_name, Class.new(PluginBase))
  klass.load(file)
end
```

**Антипаттерн**:  
Использовать `const_set` для переопределения стандартных классов:
```ruby
# ❌ Плохо: сломает весь String в системе
Object.const_set(:String, MyWeirdString)
```

---

## `const_defined?` — проверка на существование

**Теория**:  
Проверяет, определена ли константа в текущем контексте.

**Пример**: Безопасная загрузка модулей:
```ruby
unless Object.const_defined?(:Redis)
  require 'redis'
  Object.const_set(:Redis, Redis)
end
```

**Ловушка**:  
Метод принимает второй параметр `inherit` (искать в родительских классах):
```ruby
module A; MY_CONST = 1; end
class B; include A; end

B.const_defined?(:MY_CONST) #=> false
B.const_defined?(:MY_CONST, true) #=> true
```

---

## `remove_const` — удаление констант

**Теория**:  
Удаляет константу из текущего модуля/класса.

**Пример**: Очистка в тестах:
```ruby
RSpec.describe MyGem do
  after do
    MyGem.send(:remove_const, :Config) if MyGem.const_defined?(:Config)
  end
end
```

**Важно**:  
Удаление констант — опасная операция! Существующие объекты этого класса останутся в памяти.

---

# 🏗️ Переменные экземпляра

## `instance_variable_get` / `instance_variable_set`

**Теория**:  
Чтение и запись переменных экземпляра по имени (включая `@`).

**Пример**: Десериализация:
```ruby
json = { "@name" => "John", "@age" => 30 }

user = User.new
json.each do |key, value|
  user.instance_variable_set(key, value)
end
```

**Антипаттерн**:  
Злоупотребление в production-коде вместо нормальных методов доступа.

---

## `instance_variables` — список переменных

**Теория**:  
Возвращает массив имен переменных экземпляра (с `@`).

**Пример**: Отладка состояния объекта:
```ruby
def debug(obj)
  puts "Variables: #{obj.instance_variables.join(', ')}"
end
```

---

# 🏛️ Переменные класса

## `class_variable_get` / `class_variable_set`

**Теория**:  
Аналогично instance-методам, но для переменных класса (`@@`).

**Пример**: Наследуемый кеш:
```ruby
class Base
  @@cache = {}

  def self.add_to_cache(key, value)
    class_variable_set(:@@cache, class_variable_get(:@@cache).merge(key => value))
  end
end
```

**Осторожно**:  
Переменные класса видны во всей иерархии наследования!

---

## `class_variables` — список переменных класса

**Теория**:  
Возвращает массив имен переменных класса.

**Пример**: Проверка на "засорение" класса:
```ruby
if MyClass.class_variables.any?
  logger.warn "Class variables detected in #{MyClass}"
end
```

---

## 🎯 Вывод: когда это реально нужно?

1. **Метапрограммирование**: плагины, динамические классы
2. **Тесты**: моки, стабы, очистка состояния
3. **Инструменты**: дебаггеры, сериализаторы
4. **Legacy-код**: когда другого выхода нет

**Золотое правило**:  
Если можно обойтись обычными методами — используйте их. Эти инструменты — как хирургические скальпели: мощные, но опасные.

```ruby
# Иногда лучше так:
MyClass.const_get(:Settings) #=> 🚀

# Чем так:
eval "MyClass::Settings" #=> 💥
```
