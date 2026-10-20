---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: "\U0001F517 Наследование в Ruby: included, extended и другие магические методы"
date: '2025-04-26 13:00:00 +0300'
categories:
- ruby
tags: Ruby,наследование,метаклассы,модули,OOP
rate: 4
hero_image: "/images/posts/background_post-0018.webp"
---
Наследование в Ruby — это не просто `class Child < Parent`. Это целый арсенал методов для тонкой настройки поведения классов. В статье разберём ключевые инструменты работы с иерархией: от базового `superclass` до магии `prepended` модулей, и покажем, как избежать "цепочки зомби" в сложных проектах.

---
Вы когда-нибудь видели код, где `ancestors` возвращает массив длиннее списка покупок на неделю?  
Пора разобраться, кто здесь главный в иерархии наследования.

---

## 🧠 Теория: как Ruby ищет методы?

Когда вы вызываете `object.method`, Ruby:

1. Смотрит в **класс объекта**
2. Идёт по **цепочке модулей** (если есть `prepend` или `include`)
3. Проверяет **родительский класс**
4. Повторяет шаги 1-3 для суперклассов
5. Взывает к `method_missing`

Именно эту цепочку мы и будем исследовать.

---

## 🔧 Ключевые методы

### 1. `superclass` — родитель в очевидном месте

```ruby
class Animal; end
class Cat < Animal; end

Cat.superclass #=> Animal
Animal.superclass #=> Object
Object.superclass #=> BasicObject
BasicObject.superclass #=> nil
```

**Когда использовать:**  
- Проверка прямого наследования ("является ли Cat подклассом Animal?")
- Построение простых иерархий (например, разные типы платежей)

**Антипаттерн:**  
```ruby
# Плохо: проверка через superclass.superclass.superclass
def mammal?(animal)
  animal.superclass.superclass == Mammal
end
```

---

### 2. `ancestors` — полная родословная класса

```ruby
module M; end
class A; end
class B < A
  include M
end

B.ancestors #=> [B, M, A, Object, Kernel, BasicObject]
```

**Жизненный пример:**  
Допустим, у вас есть система ролей:

```ruby
module AdminPermissions; end
module UserPermissions; end

class User; end
class Admin < User
  include AdminPermissions
end

Admin.ancestors #=> [Admin, AdminPermissions, User, Object...]
```

**Когда использовать:**  
- Отладка "почему вызвался не тот метод?"
- Динамическое определение возможностей объекта

---

### 3. `included` — модуль как микс-ин

```ruby
module Loggable
  def self.included(base)
    base.extend(ClassMethods)
    base.send(:include, InstanceMethods)
  end

  module ClassMethods
    def log_level; :info; end
  end

  module InstanceMethods
    def log(msg); puts "[#{self.class.log_level}] #{msg}"; end
  end
end

class Product
  include Loggable
end

Product.log_level #=> :info
Product.new.log("Created") #=> "[info] Created"
```

**Паттерн:**  
Используйте для добавления сразу и классовых, и инстанс-методов.

**Боль:**  
Если забыть `base.extend`, классовые методы не появятся.

---

### 4. `extended` — модуль как статический хелпер

```ruby
module Pagination
  def self.extended(base)
    base.class_eval do
      scope :per_page, ->(n) { limit(n) }
    end
  end

  def total_pages; (count / 10.0).ceil; end
end

class Post < ActiveRecord::Base
  extend Pagination
end

Post.total_pages #=> 3
Post.per_page(5) #=> AR scope
```

**Контраст с included:**  
- `include` — добавляет методы в **экземпляры**
- `extend` — добавляет методы в **сам класс**

---

### 5. `prepended` — модуль, который "перебивает" методы

```ruby
module SoftDelete
  def self.prepended(base)
    base.scope :active, -> { where(deleted_at: nil) }
  end

  def destroy
    update(deleted_at: Time.current)
  end
end

class Comment < ActiveRecord::Base
  prepend SoftDelete
end

comment = Comment.create!
comment.destroy # Вызовет метод из SoftDelete, а не из AR
```

**Когда использовать:**  
- Переопределение методов без monkey-patching
- Приоритетное выполнение кода (например, before-фильтры)

**Опасность:**  
Если в модуле не вызвать `super`, цепочка вызовов прервётся.

---

## 💥 Антипаттерны

1. **Спагетти-наследование**  
   ```ruby
   class A < B; include M; prepend N; extend P; end
   # Теперь попробуйте представить ancestors...
   ```

2. **Злоупотребление prepend**  
   Переопределение базовых методов в 10 модулях — верный способ получить неотлаживаемый код.

3. **Модули-швейцары**  
   Когда один модуль и `include`, и `extend`, и `prepend` — это нарушение SRP.

---

## 🎤 Что сказать на собеседовании

> — Как вы организуете сложную иерархию классов?

— Использую модули для горизонтального расширения функциональности (`include`/`extend`), а наследование — только для выражения отношения "является". Для переопределения методов предпочитаю `prepend` перед monkey-patching.

---

## 🧾 Вывод

**Цепочка наследования в Ruby — как матрёшка:**  
- `superclass` показывает прямого родителя  
- `ancestors` раскрывает всю цепочку  
- `included`/`extended`/`prepended` — крючки для модулей  

Правильное использование этих инструментов превращает запутанную иерархию в прозрачную архитектуру. Главное — не превращать код в "дом, который построил Джек" из 20 уровней наследования.
