---
layout: post
title:  "Ruby: Yielder, BasicObject и прочие тайные элементы языка"
date:   2022-02-02 11:00:00 +0300
categories:
  - ruby
toc: true
menubar_toc: true
hero_image: /images/ruby.jpeg
hero_darken: true
---

Не всё, что есть в Ruby, ты встречал в жизни. Эти штуки редки, но их любят на собеседованиях «для проверки глубины».

---

## 🧵 Enumerator::Yielder

```ruby
enum = Enumerator.new do |y|
  y << 1
  y << 2
end

enum.to_a # => [1, 2]
````

`y` здесь — это `Enumerator::Yielder`, объект, в который ты **пушишь** значения.

---

## 🔍 BasicObject — совсем без удобств

```ruby
class Clean < BasicObject
  def inspect
    "Ничего лишнего"
  end
end
```

* Без `Kernel`, `puts`, `p`, `require`, даже `==`.
* Используется для прокси, sandbox и DSL.

---

## 🪞 **id** и **send**

```ruby
obj.__id__     # => объектный ID
obj.__send__ :to_s  # => безопасный вызов метода
```

Нужны, если метод `id` или `send` переопределён.

---

## 📦 Binding и локальные переменные

```ruby
def context
  x = 42
  binding
end

eval("x + 1", context) # => 43
```

Позволяет передать **снимок текущего окружения**.

---

## 🔮 local\_variables

```ruby
def demo
  foo = 1
  bar = 2
  local_variables  # => [:foo, :bar]
end
```

Можно получить список локальных переменных во время выполнения. На собесах иногда просят написать REPL.

---

🔚 **Вывод:**
Эти штуки — как ниндзя: ты не видишь их в проде, но они работают. Знать про `Binding`, `BasicObject` и `Enumerator::Yielder` — это +5 к глубине познания Ruby.
