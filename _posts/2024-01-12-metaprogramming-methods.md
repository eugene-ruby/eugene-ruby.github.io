---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: Метапрограммирование — define_method, alias, const_get и send без сюрпризов'
date: '2024-01-12 10:00:00 +0300'
categories:
- ruby
tags: метапрограммирование,Ruby,define_method,alias_method,const_get,send
rate: 4
hero_image: "/images/posts/background_post-0022.webp"
---
Метапрограммирование в Ruby открывает двери в мир динамического создания и управления методами, классами и константами прямо во время выполнения кода. В этой статье разберём ключевые инструменты — от `define_method` до `const_get` — и их тонкости, которые помогут писать гибкий и DRY-код без лишнего дублирования. Особое внимание уделим различиям между похожими методами, чтобы избежать подводных камней в продакшене.

---
В прошлой статье мы обсуждали `method_missing`, теперь углубимся в метапрограммирование по полной: `define_method`, `alias_method`, `const_get`, `send`, и другие любимые конструкции архитекторов.

## 🧱 define_method — динамика и DRY

```ruby
class User
  [:name, :email].each do |attr|
    define_method("get_#{attr}") do
      instance_variable_get("@#{attr}")
    end
  end
end
````

Создаёт метод **на лету**, можно применять в любых DSL.

---

## 🪞 alias\_method vs alias

```ruby
class Greeter
  def hello
    "Hi!"
  end

  alias_method :greet, :hello
end
```

* `alias_method` — метод, работает с символами (`:name`)
* `alias` — ключевое слово, требует имена (`alias greet hello`)

---

## 💣 remove\_method vs undef\_method

```ruby
class Example
  def hello; "hi"; end
  remove_method :hello
end
```

* `remove_method` — убирает **только в текущем классе**
* `undef_method` — убивает метод **и из предков**

---

## 🎯 send, public\_send, **send**

```ruby
"Ruby".send(:upcase)       # => "RUBY"
"Ruby".public_send(:upcase) # => "RUBY"
"Ruby".__send__(:upcase)    # => "RUBY"
```

* `send` вызывает даже приватное
* `public_send` — только публичное
* `__send__` — fallback, если переопределили `send`

---

## 📦 const\_get, const\_defined?, const\_set

```ruby
module Admin
  class Report; end
end

puts Admin.const_get(:Report)             # => Admin::Report
puts Admin.const_defined?(:Report)        # => true
Admin.const_set(:User, Class.new)
puts Admin::User.new.class.name           # => Admin::User
```

Позволяет работать с константами, создавая и проверяя их в рантайме.

---

## 🧨 Комбо-подвох

```ruby
class A
  const_set(:B, Class.new)
end

puts A::B.name        # => "A::B"
puts A.const_get(:C)  # => 💥 NameError
```

---

🔚 **Вывод:**
Метапрограммирование — это мощь, которая требует контроля. На собеседовании тебя проверят: не только на знание методов, но и на **понимание их различий и применимости**.
