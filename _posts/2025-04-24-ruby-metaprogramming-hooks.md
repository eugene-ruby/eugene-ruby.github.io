---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: "\U0001FA84 Магия хуков в Ruby: method_missing и define_singleton_method"
date: '2025-04-24 10:00:00 +0300'
categories:
- ruby
tags: Ruby,метапрограммирование,методы,хуки,рефлексия
rate: 4
hero_image: "/images/posts/background_post-0034.webp"
---
Ruby — язык, где можно подслушать, как объекты шепчутся между собой, и даже вставить своё слово. В статье разберём два мощных хука: `method_missing` для перехвата несуществующих методов и `define_singleton_method` для динамического создания методов на лету. Покажем, как ими пользоваться без вреда для кодовой базы.

---
Вы когда-нибудь видели, как код сам себя дописывает?  
Или как объект отвечает на методы, которых у него нет?  
Добро пожаловать в мир **метапрограммирования Ruby**.

---

## 🧙‍♂️ `method_missing`: ловец призрачных методов

### Что это?
Хук, который вызывается, когда объект получает вызов **несуществующего метода**.  
Как будто вы крикнули "Эй!" в пустую комнату, а оттуда вдруг ответили.

### Пример из жизни
Допустим, у вас есть API клиент, где методы соответствуют эндпоинтам:

```ruby
class ApiClient
  def method_missing(name, *args)
    if name.to_s.start_with?('get_')
      endpoint = name.to_s.delete_prefix('get_')
      fetch_from_api(endpoint, *args)
    else
      super # Важно: передаём дальше, если не наш случай
    end
  end

  private

  def fetch_from_api(endpoint, params = {})
    # Реальный вызов API
    puts "Fetching #{endpoint} with #{params}"
  end
end
```

Теперь можно вызывать что угодно с префиксом `get_`:

```ruby
client = ApiClient.new
client.get_users(active: true) # => "Fetching users with {:active=>true}"
client.get_products            # => "Fetching products with {}"
client.delete_user             # => NoMethodError (мы не обрабатываем delete_)
```

### ⚠️ Опасные грабли
1. **Не забывайте `super`** — иначе "съедите" все ошибки NoMethodError.
2. **Производительность** — каждый промах проходит через `method_missing`.
3. **Отладка** — стектрейсы становятся длиннее и менее понятными.

### Когда применять?
- Динамические прокси-объекты (как в примере с API).
- Реализация паттерна "Null Object".
- DSL (Domain Specific Language), где методы генерируются из входных данных.

---

## 🎩 `define_singleton_method`: метод на один вечер

### Что это?
Способ создать метод **только для конкретного экземпляра объекта**.  
Представьте, что вы надели на объект уникальный костюм, которого нет у других.

### Пример из жизни
Допустим, у вас есть система плагинов, где каждый плагин может добавить свои методы в ядро:

```ruby
class CoreSystem
  # Пустое ядро
end

plugin = {
  name: :hello_plugin,
  action: -> { puts "Hello from plugin!" }
}

core = CoreSystem.new
core.define_singleton_method(plugin[:name], &plugin[:action])

core.hello_plugin # => "Hello from plugin!"
another_core = CoreSystem.new
another_core.hello_plugin # => NoMethodError!
```

Или более практичный пример — кэширование тяжёлых вычислений:

```ruby
class DataProcessor
  def process(data)
    # Создаём уникальный метод для этого набора данных
    define_singleton_method(:cached_result) do
      @result ||= heavy_computation(data)
    end

    cached_result
  end

  private

  def heavy_computation(data)
    sleep(2)
    data.upcase
  end
end

processor = DataProcessor.new
processor.process("test") # Долгий вызов
processor.process("test") # Мгновенно — использует кэш
```

### ⚠️ Опасные грабли
1. **Утечки памяти** — методы живут столько же, сколько и объект.
2. **Сложность отладки** — откуда взялся этот метод? Где его исходник?
3. **Тестирование** — динамические методы усложняют предсказуемость.

### Когда применять?
- Динамическое расширение объектов (плагины, адаптеры).
- Оптимизация (мемоизация, как в примере с кэшем).
- Создание prototype-объектов в паттернах проектирования.

---

## 🧪 Тест на адекватность

Прежде чем использовать эти методы, спросите себя:

1. **Можно ли решить задачу обычными методами?**  
   (Если да — возможно, так и стоит сделать)
2. **Будет ли код понятен вашей команде через месяц?**  
   (Документируйте магию!)
3. **Не нарушаем ли мы принцип наименьшего удивления?**  
   (Если объект ведёт себя слишком хитро — это повод пересмотреть архитектуру)

---

## 🎤 Что сказать на собеседовании

> — Как вы обрабатываете динамические вызовы методов в Ruby?

— Для перехвата несуществующих методов использую `method_missing` с обязательным вызовом `super`, а для создания методов на лету — `define_singleton_method`. Но всегда оцениваю, не усложнит ли это код.

---

## 🧾 Вывод

**`method_missing`** — это швейцарский нож для обработки "призрачных" методов, но он требует аккуратности.  
**`define_singleton_method`** — мощный способ кастомизировать отдельные объекты, но он оставляет след в памяти.  
