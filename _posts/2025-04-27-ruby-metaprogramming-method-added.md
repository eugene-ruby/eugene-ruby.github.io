---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Специальные методы в Ruby: как подслушать свои классы'
date: '2025-04-27 10:00:00 +0300'
categories:
- ruby
tags: Ruby,метапрограммирование,рефлексия,методы
rate: 4
hero_image: "/images/posts/background_post-0088.webp"
---
Ruby — язык с открытыми настройками. Хотите знать, когда в классе появляется новый метод? Или отследить удаление синглтон-метода? Специальные методы-хуки дают вам такую возможность. Разберёмся, как ими пользоваться без вреда для кодовой базы.

---
Вы только что добавили `def calculate_tax` в класс `Invoice`…  
А система аналитики уже об этом знает. Магия? Нет, просто `method_added`.

---

## 🧠 Теория: что за специальные методы?

Это **хуки**, которые Ruby вызывает автоматически при изменениях в классе или объекте. Они позволяют:

* Логировать изменения методов
* Валидировать новые методы
* Автоматически обновлять кеши
* Реагировать на удаление функциональности

Работают как **сигналы светофора** в метапрограммировании — предупреждают о событиях.

---

## 🔍 Разбираем методы

### 1. `method_added(name)`
Срабатывает при добавлении **обычного метода** в класс.

```ruby
class Logger
  def self.method_added(method_name)
    puts "Добавлен метод: #{method_name}"
    super
  end

  def log(message) = puts(message)
end
# => "Добавлен метод: log"
```

**Где использовать:**  
- Автоматическая документация  
- Валидация имен методов (например, запрет `snake_case`)

---

### 2. `singleton_method_added(name)`
Отслеживает добавление **метода к конкретному объекту**.

```ruby
obj = Object.new

def obj.singleton_method_added(name)
  puts "Синглтон-метод #{name} добавлен!"
end

def obj.hello = "world"
# => "Синглтон-метод hello добавлен!"
```

**Где использовать:**  
- Отладка динамических методов в REPL  
- Плагины для объектов (например, `user.extend(Admin)`)

---

### 3. `method_removed(name)` и `method_undefined(name)`
Разница тонкая, но важная:

| Метод                | Когда срабатывает               |
|----------------------|---------------------------------|
| `method_removed`     | При `remove_method`             |
| `method_undefined`   | При `undef_method`              |

```ruby
class CleanupWatcher
  def self.method_undefined(name)
    puts "Метод #{name} стал undefined — это навсегда!"
  end
end
```

**Где использовать:**  
- Безопасное удаление методов в плагинах  
- Запрет на удаление критичных методов

---

### 4. `singleton_method_removed` и `singleton_method_undefined`
Аналогично, но для синглтон-методов:

```ruby
admin = User.find(1)

def admin.singleton_method_removed(name)
  raise "Нельзя удалять методы админа!" if name == :grant_access
end
```

---

## 🧪 Практика: кейсы из жизни

### Кейс 1: Валидация API-методов

```ruby
class ApiEndpoint
  def self.method_added(name)
    raise "Используй snake_case!" unless name.match?(/^[a-z_]+$/)
    super
  end

  def get_users = # ...
end
# => Ошибка: Используй snake_case!
```

### Кейс 2: Автоматический кеш

```ruby
class Product
  @cache = {}

  def self.method_added(name)
    @cache.clear if name.match?(/^calculate_/)
    super
  end
end
```

---

## 💣 Антипаттерны

1. **Рекурсия**: вызов `define_method` внутри `method_added`  
   → Бесконечный цикл.

2. **Тяжёлая логика**:  
   ```ruby
   def self.method_added(name)
     SaveMethodToDatabase.call(name) # 200ms за каждый метод!
   end
   ```

3. **Игнорирование `super`**:  
   ```ruby
   def singleton_method_added(name)
     # Забыли super → ломаем цепочку вызовов
   end
   ```

---

## 🎤 Что сказать на собеседовании

> — Как можно отследить добавление метода в рантайме?

— В Ruby для этого есть специальные хуки вроде `method_added`. Они позволяют перехватывать изменения класса, но требуют аккуратного использования, чтобы не нарушить работу цепочки наследования.

---

## 🧾 Вывод

Специальные методы — это **стетоскоп для ваших классов**.  
Используйте их для:

✅ Отладки метапрограммирования  
✅ Автоматизации документирования  
✅ Защиты критичных методов  

Но помните: как и с любыми хуками, **чем тише — тем лучше**. Не превращайте их в свалку бизнес-логики.
