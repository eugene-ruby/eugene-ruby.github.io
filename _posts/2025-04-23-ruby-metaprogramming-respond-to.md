---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: "\U0001F50D Методы о методах: как Ruby позволяет исследовать поведение объектов"
short_description: Как проверить, какие методы доступны объекту Ruby, получить метод
  как объект и разобраться с динамическими методами. Примеры показывают различия между
  respond_to?, method_defined?, instance_methods и singleton_methods.
date: '2025-04-23 12:00:00 +0300'
categories:
- ruby
tags: Ruby,метапрограммирование,рефлексия,объектная-модель
rate: 4
hero_image: "/images/posts/background_post-0055.webp"
---
В Ruby всё — объект, а поведение объекта определяется его методами. Как узнать, какие методы ему доступны, проверить его возможности или добавить поведение во время выполнения? Разберём инструменты интроспекции Ruby на практических примерах.

В примерах с `User` предполагается модель Active Record; доступность конкретных методов зависит от модели и её столбцов.

---

## 🧠 Теория: зачем нужна интроспекция методов?

Интроспекция (рефлексия) — это возможность программы исследовать свою структуру во время выполнения. В Ruby она полезна, потому что:

- Объекты могут динамически получать новые методы.
- Классы могут переопределять поведение во время работы программы.
- Методы могут быть приватными, защищёнными или публичными.

Разберём ключевые инструменты для работы с методами.

---

## 1️⃣ `method` — получаем метод как объект

```ruby
user = User.find(1)
save_method = user.method(:save) # объект Method

save_method.call # вызывает метод save у user
```

**Жизненный пример:** вы пишете обработчик событий, который вызывает метод объекта по имени события:

```ruby
def handle_event(object, event_name)
  if object.respond_to?(event_name)
    object.method(event_name).call
  else
    # обработка отсутствия метода
  end
end
```

Если имя события приходит из недоверенного источника, одной проверки `respond_to?` недостаточно: ограничьте список методов, которые разрешено вызывать. Проверка также не гарантирует, что метод принимает ноль аргументов.

Вызов `method` с неизвестным именем вызовет `NameError`. Но предварительная проверка нужна не всегда: если отсутствие метода — ошибка, исключение можно обработать там, где это уместно. Кроме того, `method` может получить приватный метод, который `respond_to?` без второго аргумента не покажет.

---

## 2️⃣ `respond_to?` — проверяем наличие метода

```ruby
"строка".respond_to?(:upcase) # => true
42.respond_to?(:split)       # => false
```

**Практический кейс:** ответ API может быть объектом с `to_h` или строкой JSON. Здесь проверка метода помогает обработать первый вариант, а для строки нужен отдельный разбор:

```ruby
require 'json'

def parse_response(response)
  if response.respond_to?(:to_h)
    response.to_h
  elsif response.is_a?(String)
    JSON.parse(response)
  else
    raise ArgumentError, "Unsupported response format"
  end
end
```

`respond_to?` проверяет доступность метода, но не его результат. Если вызывающему коду нужен именно `Hash`, проверьте результат `to_h` или `JSON.parse` отдельно.

**Важно:** `respond_to?` по умолчанию не учитывает приватные методы. Чтобы включить их в проверку, передайте второй аргумент:

```ruby
user.respond_to?(:admin?, true) # учитывает и приватный метод
```

---

## 3️⃣ `respond_to_missing?` — магия method_missing

Если обычный поиск метода ничего не нашёл, Ruby передаёт вызов в `method_missing`. Когда объект действительно обрабатывает такие вызовы, стоит переопределить и `respond_to_missing?`, чтобы `respond_to?` и `method` отражали это поведение:

```ruby
class DynamicAttributes
  def initialize(records)
    @records = records
  end

  def method_missing(name, *args, &block)
    if name == :find_by_email && args.length == 1 && !block
      @records.find { |record| record[:email] == args.first }
    else
      super
    end
  end

  def respond_to_missing?(name, include_private = false)
    name == :find_by_email || super
  end
end

users = DynamicAttributes.new([{ email: 'a@example.com' }])
users.respond_to?(:find_by_email) # => true
users.method(:find_by_email).call('a@example.com') # => { email: 'a@example.com' }
```

Здесь `respond_to_missing?` объявляет только то имя, которое умеет обработать `method_missing`. Проверка числа аргументов остаётся в самом обработчике: `respond_to?` не проверяет сигнатуру вызова.

**Пример из жизни:** у модели Active Record динамический finder вызывают на классе модели, если есть соответствующий столбец:

```ruby
User.respond_to?(:find_by_email) # => true при наличии столбца email
```

---

## 4️⃣ `method_defined?` — проверка на уровне класса

```ruby
User.method_defined?(:save) # => true, если доступен метод экземпляра save
User.method_defined?(:new)  # => false, new — метод класса
```

**Практическое применение:** при подключении модуля можно проверить, доступен ли уже метод экземпляра:

```ruby
module OptionalFeature
  def feature
    :enabled
  end
end

User.include(OptionalFeature) unless User.method_defined?(:feature)
```

`method_defined?` учитывает публичные и защищённые методы экземпляра, в том числе унаследованные и полученные из подключённых модулей. Приватные методы он не учитывает: для них есть `private_method_defined?`. Поэтому, если важно избежать конфликта с методом любого уровня доступа, проверяйте и их.

---

## 5️⃣ `instance_methods` — методы экземпляра

```ruby
User.instance_methods(false) # методы, определённые непосредственно в User
User.instance_methods(true)  # также методы предков и подключённых модулей
```

**Реальный пример:** проверка списка методов экземпляра:

```ruby
required_methods = [:save, :validate, :to_json]
missing = required_methods - User.instance_methods

raise "Interface not implemented: #{missing}" unless missing.empty?
```

Здесь не стоит передавать `false`: нужный метод мог прийти из предка или модуля. Но и полный список не охватывает методы, обрабатываемые через `method_missing`. Для проверки возможностей конкретного объекта в таком случае используйте `respond_to?`.

Параметр `false` полезен, когда нужны именно методы, определённые непосредственно в классе, например при изучении его собственной реализации.

---

## 6️⃣ `singleton_methods` — методы конкретного объекта

```ruby
user = User.new
def user.custom_method; end

user.singleton_methods(false) # => [:custom_method]
```

**Кейс из практики:** динамическое добавление поведения одному объекту:

```ruby
def decorate_user(user, role)
  if role == :admin
    def user.admin?; true; end
  end
  user
end

admin = decorate_user(User.new, :admin)
admin.singleton_methods(false) # => [:admin?]
```

С `false` метод показывает методы, определённые непосредственно у этого объекта. Без аргумента в список могут попасть и методы из модулей, подключённых к его синглтон-классу.

**Осторожно:** злоупотребление синглтон-методами усложняет отладку и тестирование.

---

## 🧪 Тестирование методов

Проверка наличия методов в тестах:

```ruby
describe User do
  it "implements required interface" do
    expect(User.instance_methods).to include(:save, :destroy)
  end

  it "responds to dynamic finders" do
    expect(User).to respond_to(:find_by_email)
  end
end
```

Второй тест применим, если у модели есть столбец `email`: динамический finder вызывается на `User`, а не на `User.new`.

---

## 🎤 Что сказать на собеседовании

> — Как вы проверяете, что объект реализует нужный интерфейс?

— В Ruby есть несколько уровней проверки: `respond_to?` — для конкретного объекта, `method_defined?` — для методов экземпляра класса, `instance_methods` — для их списка. Если методы обрабатываются через `method_missing`, важно согласовать это поведение с `respond_to_missing?`.

---

## 🧾 Вывод

1. Используйте `method`, когда нужно работать с методом как с объектом.
2. `respond_to?` помогает проверить доступность метода, но не его аргументы и результат.
3. Если `method_missing` обрабатывает вызовы динамически, реализуйте соответствующий `respond_to_missing?`.
4. `method_defined?` и `instance_methods` исследуют методы экземпляров на уровне класса, но по-разному учитывают область поиска.
5. `singleton_methods(false)` показывает методы, определённые непосредственно у конкретного объекта.

Интроспекция помогает выяснить, какое поведение доступно объекту во время выполнения, — главное, выбрать проверку под свою задачу.