---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: Yielder, BasicObject и прочие тайные элементы языка'
date: '2022-02-02 11:00:00 +0300'
categories:
- ruby
tags: Ruby,метапрограммирование,DSL,Enumerator::Yielder,BasicObject,Binding
rate: 5
hero_image: "/images/posts/background_post-0094.webp"
---
Ruby — это не просто язык, а целая вселенная возможностей для разработчика. Но знаете ли вы все его скрытые грани? В этой статье мы раскроем мощные, но редко используемые инструменты Ruby, которые помогут вам писать более выразительный и эффективный код. Вы узнаете, как применять `Enumerator::Yielder` для ленивых вычислений, зачем нужен `BasicObject` в метапрограммировании и как использовать `Binding` для отладки сложных сценариев. Эти знания не только прокачают ваш скилл-лист, но и дадут преимущество на собеседованиях — ведь именно такие «жемчужины» Ruby любят спрашивать у продвинутых разработчиков. Готовы погрузиться в магию Ruby глубже, чем 90% программистов? Тогда поехали!

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
