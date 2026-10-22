---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: "\U0001F517 Наследование и модули в Ruby: included, extended и prepended"
short_description: 'Как Ruby ищет методы в цепочке наследования и модулей: разбираем
  superclass, ancestors и хуки included, extended и prepended на примерах.'
date: '2025-04-26 13:00:00 +0300'
categories: []
tags:
- Inheritance
- Object-oriented Programming
rate: 4
hero_image: "/images/posts/background_post-0018.webp"
---
Наследование в Ruby — это не только `class Child < Parent`. На поиск методов влияют также подключённые модули, а хуки `included`, `extended` и `prepended` позволяют настроить поведение класса при их подключении. Разберём эти инструменты и посмотрим, где легко запутаться в цепочке вызовов.

---
Вы когда-нибудь видели код, где `ancestors` возвращает массив длиннее списка покупок на неделю?  
Пора разобраться, в каком порядке Ruby ищет методы.

---

## 🧠 Теория: как Ruby ищет методы?

Когда вы вызываете метод экземпляра, Ruby ищет его в таком порядке:

1. В модулях, подключённых к классу через `prepend`.
2. В самом классе.
3. В модулях, подключённых через `include`.
4. В той же последовательности для суперклассов.
5. Если метод не найден, обращается к `method_missing`.

Для методов самого класса цепочка другая: Ruby ищет их через singleton class. Методы модуля, добавленные с помощью `extend`, попадают именно туда. Дальше исследуем обе ситуации.

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
- Проверка прямого родителя класса: `Cat.superclass == Animal`.
- Изучение иерархии классов при отладке.

Если нужно узнать, является ли объект экземпляром класса или его подкласса, проверка прямого родителя не подойдёт. Используйте `is_a?`:

```ruby
def animal?(object)
  object.is_a?(Animal)
end
```

Проверки вида `object.class.superclass.superclass == Animal` зависят от точной глубины иерархии и ломаются при добавлении промежуточного класса.

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

Admin.ancestors #=> [Admin, AdminPermissions, User, Object, Kernel, BasicObject]
```

**Когда использовать:**  
- Отладка: «почему вызвался не тот метод?»
- Проверка того, какие модули входят в цепочку поиска методов класса.

`UserPermissions` в этом примере в цепочку не входит: модуль объявлен, но нигде не подключён.

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
Product.new.log("Created") # печатает [info] Created
```

**Паттерн:**  
Хук `included` вызывается при подключении модуля через `include`. Здесь он добавляет классу методы из `ClassMethods`, а экземплярам — методы из `InstanceMethods`. Для простого модуля без такой настройки хук не нужен.

**Боль:**  
Если забыть `base.extend`, метод `Product.log_level` не появится. А `puts` печатает строку, но возвращает `nil`: комментарий в примере описывает вывод, а не возвращаемое значение `log`.

---

### 4. `extended` — модуль для методов класса

```ruby
module Pagination
  def self.extended(base)
    base.class_eval do
      scope :per_page, ->(n) { limit(n) }
    end
  end

  def total_pages(per_page)
    (count.to_f / per_page).ceil
  end
end

class Post < ActiveRecord::Base
  extend Pagination
end

Post.total_pages(5) # число страниц по 5 записей; зависит от Post.count
Post.per_page(5)  # отношение ActiveRecord с ограничением LIMIT 5
```

**Контраст с `included`:**  
- `include` добавляет методы модуля в цепочку поиска методов **экземпляров**.
- `extend` добавляет их в цепочку поиска методов **самого объекта** — здесь класса `Post`.

Хук `extended` создаёт `scope :per_page` средствами Active Record. `total_pages` считает страницы для всех записей `Post`, а не для произвольной выборки; аргумент `per_page` должен быть больше нуля. В реальном приложении стоит учитывать стоимость `count` и отдельно определять поведение для отфильтрованных выборок.

---

### 5. `prepended` — модуль, который «перебивает» методы

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
comment.destroy # вызовет метод из SoftDelete, а не обычный destroy Active Record
```

**Когда использовать:**  
- Оборачивание метода дополнительной логикой с возможностью вызвать исходную реализацию через `super`.
- Изменение приоритета метода без прямого переопределения его в классе.

**Опасность:**  
В этом примере `super` намеренно не вызывается: иначе выполнится обычное удаление. Но такая замена `destroy` не воспроизводит его поведение: вместо колбэков удаления выполняется обновление, не срабатывает связанная с удалением логика, а результат `update` отличается от результата обычного `destroy`. Кроме того, `active` нужно применять явно — `Comment.all` продолжит включать помеченные записи. Это иллюстрация порядка поиска методов, а не готовая реализация soft delete.

Если же модуль должен **дополнить**, а не заменить метод, отсутствие `super` прервёт цепочку вызовов.

---

## 💥 Антипаттерны

1. **Спагетти-наследование**  
   ```ruby
   class A < B; include M; prepend N; extend P; end
   # Теперь попробуйте представить ancestors...
   ```
   Само сочетание этих механизмов не ошибка. Проблема возникает, когда порядок поиска методов и назначение каждого модуля трудно понять без постоянной проверки `ancestors`.

2. **Злоупотребление `prepend`**  
   Когда один и тот же метод оборачивают множество модулей, порядок вызовов становится трудно отслеживать. Проверяйте цепочку и явно решайте, где нужен `super`.

3. **Модули-швейцары**  
   Если модуль одновременно требует `include`, `extend` и `prepend`, стоит проверить, не смешаны ли в нём разные обязанности. Само по себе использование нескольких способов подключения не делает модуль ошибочным.

---

## 🎤 Что сказать на собеседовании

> — Как вы организуете сложную иерархию классов?

— Использую наследование там, где подкласс действительно выражает отношение «является», а модули — для повторного использования поведения. Если нужно обернуть существующий метод, рассматриваю `prepend` и проверяю порядок вызовов; если нужно заменить его поведение, отдельно учитываю последствия отказа от `super`.

---

## 🧾 Вывод

**Цепочка поиска методов в Ruby — как матрёшка:**  
- `superclass` показывает прямого родителя класса.  
- `ancestors` показывает классы и модули в цепочке поиска методов экземпляра.  
- `included`, `extended` и `prepended` — хуки, вызываемые при разных способах подключения модуля.  

Эти инструменты помогают разобраться в сложной иерархии. Главное — помнить, что `prepend` меняет приоритет метода, а замена существующего поведения может затронуть не только результат вызова.