---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: "\U0001F50D Методы о методах: как Ruby позволяет исследовать поведение объектов"
date: '2025-04-23 12:00:00 +0300'
categories:
- ruby
tags: Ruby,метапрограммирование,рефлексия,объектная-модель
rate: 4
hero_image: "/images/posts/background_post-0055.webp"
---
В Ruby всё — объект, а каждый объект обладает поведением, определяемым его методами. Но как узнать, какие методы доступны объекту, как проверить его возможности и даже подменить их? Разберём инструменты интроспекции Ruby на практических примерах из жизни разработчика.

---

## 🧠 Теория: зачем нужна интроспекция методов?

Интроспекция (рефлексия) — это возможность программы исследовать свою собственную структуру во время выполнения. В Ruby это особенно важно, потому что:

- Объекты могут динамически получать новые методы
- Классы могут переопределять поведение "на лету"
- Методы могут быть приватными, защищёнными или публичными

Разберём ключевые методы для работы с методами.

---

## 1️⃣ `method` — получаем метод как объект

```ruby
user = User.find(1)
save_method = user.method(:save)
# => #<Method: User#save()>

save_method.call # аналогично user.save
```

**Жизненный пример**:  
Вы пишете универсальный обработчик событий, где нужно вызывать разные методы объекта в зависимости от входящих данных:

```ruby
def handle_event(object, event_name)
  if object.respond_to?(event_name)
    object.method(event_name).call
  else
    # обработка отсутствия метода
  end
end
```

**Антипаттерн**:  
Использовать `method` без проверки `respond_to?` — это верный способ получить `NameError`.

---

## 2️⃣ `respond_to?` — проверяем наличие метода

```ruby
"строка".respond_to?(:upcase) # => true
42.respond_to?(:split)       # => false
```

**Практический кейс**:  
При работе с API ответ может приходить в разных форматах:

```ruby
def parse_response(response)
  if response.respond_to?(:to_h)
    response.to_h
  elsif response.respond_to?(:to_json)
    JSON.parse(response.to_json)
  else
    raise "Unsupported response format"
  end
end
```

**Важно**:  
`respond_to?` не видит приватные методы по умолчанию. Нужно передать второй параметр:

```ruby
user.respond_to?(:admin?, true) # проверяет приватные методы тоже
```

---

## 3️⃣ `respond_to_missing?` — магия method_missing

Когда вызывается несуществующий метод, Ruby проверяет `method_missing`. Но для корректной работы `respond_to?` нужно переопределить и `respond_to_missing?`:

```ruby
class DynamicAttributes
  def method_missing(name, *args)
    if name.to_s.start_with?('find_by_')
      # реализация поиска
    else
      super
    end
  end

  def respond_to_missing?(name, include_private = false)
    name.to_s.start_with?('find_by_') || super
  end
end
```

**Пример из жизни**:  
ORM вроде ActiveRecord использует это для динамических finder'ов:

```ruby
User.respond_to?(:find_by_email) # => true, хотя метод явно не определён
```

---

## 4️⃣ `method_defined?` — проверка на уровне класса

```ruby
User.method_defined?(:save) # => true
User.method_defined?(:new)  # => false (это метод класса)
```

**Практическое применение**:  
При создании плагина или модуля, который добавляет методы только если они ещё не определены:

```ruby
module SafeMonkeyPatch
  def add_feature
    unless method_defined?(:original_method)
      alias_method :original_method, :method
      # ... наша переопределённая реализация
    end
  end
end
```

**Осторожно**:  
`method_defined?` не проверяет методы модулей, включённых в класс.

---

## 5️⃣ `instance_methods` — все методы экземпляра

```ruby
User.instance_methods(false) # только методы, определённые в User
User.instance_methods(true)  # включая унаследованные
```

**Реальный пример**:  
Генерация документации или валидация интерфейса:

```ruby
required_methods = [:save, :validate, :to_json]
missing = required_methods - User.instance_methods(false)

raise "Interface not implemented: #{missing}" unless missing.empty?
```

**Совет**:  
Используйте `false` как параметр, чтобы не засорять вывод унаследованными методами.

---

## 6️⃣ `singleton_methods` — методы конкретного объекта

```ruby
user = User.new
def user.custom_method; end

user.singleton_methods # => [:custom_method]
```

**Кейс из практики**:  
Декораторы или динамическое добавление поведения:

```ruby
def decorate_user(user, role)
  if role == :admin
    def user.admin?; true; end
  end
  user
end

admin = decorate_user(User.new, :admin)
admin.singleton_methods # => [:admin?]
```

**Антипаттерн**:  
Злоупотребление синглтон-методами усложняет отладку и тестирование.

---

## 🧪 Тестирование методов

Проверка наличия методов в тестах:

```ruby
describe User do
  it "implements required interface" do
    expect(User.instance_methods).to include(:save, :destroy)
  end

  it "responds to dynamic finders" do
    expect(User.new).to respond_to(:find_by_email)
  end
end
```

---

## 🎤 Что сказать на собеседовании

> — Как вы проверяете, что объект реализует нужный интерфейс?

— В Ruby есть несколько уровней проверки: `respond_to?` для конкретного объекта, `method_defined?` для класса, `instance_methods` для полного списка. Важно понимать различия и использовать их в зависимости от контекста.

---

## 🧾 Вывод

1. Используйте `method` когда нужно работать с методом как с объектом
2. `respond_to?` — ваша первая линия защиты от NoMethodError
3. Для method_missing всегда реализуйте `respond_to_missing?`
4. `method_defined?` и `instance_methods` работают на уровне классов
5. `singleton_methods` покажут методы конкретного экземпляра

**Интроспекция методов — это как рентген для ваших объектов: позволяет заглянуть внутрь и понять их структуру, не разбирая на части.**
