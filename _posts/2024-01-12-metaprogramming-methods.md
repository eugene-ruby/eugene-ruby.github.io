---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: Метапрограммирование — define_method, alias, const_get и send без сюрпризов'
short_description: 'Как динамически создавать методы и работать с константами в Ruby:
  разбираем define_method, alias_method, const_get и различия между remove_method,
  undef_method, send и public_send.'
date: '2024-01-12 10:00:00 +0300'
categories:
- development
tags:
- alias_method
- const_get
- define_method
- Dynamic Dispatch
- Metaprogramming
- Method Visibility
- send
rate: 4
hero_image: "/images/posts/background_post-0022.webp"
---
Метапрограммирование в Ruby позволяет создавать методы и работать с константами во время выполнения программы. Разберём `define_method`, `alias_method`, `const_get` и похожие методы, различия между которыми легко упустить.

---
В прошлой статье мы обсуждали `method_missing`. Теперь посмотрим на другие инструменты метапрограммирования.

## 🧱 define_method — динамика и DRY

```ruby
class User
  [:name, :email].each do |attr|
    define_method("get_#{attr}") do
      instance_variable_get("@#{attr}")
    end
  end
end
```

При выполнении тела класса цикл создаёт методы `get_name` и `get_email`. Такой приём помогает убрать повторяющиеся определения методов, в том числе в DSL. Здесь методы возвращают значения переменных экземпляра; сами переменные этот код не устанавливает.

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

* `alias_method` — метод, который принимает имена методов в виде символов или строк. Аргументы можно вычислять динамически.
* `alias` — ключевое слово: `alias greet hello`. Оно также допускает символы (`alias :greet :hello`), но не принимает вычисленные аргументы как вызов метода.

Оба варианта создают псевдоним существующего метода, а не перенаправляют вызов по имени. Если позже переопределить `hello`, уже созданный `greet` не начнёт автоматически вызывать новую реализацию.

---

## 💣 remove\_method vs undef\_method

```ruby
class Parent
  def hello; "from parent"; end
end

class Example < Parent
  def hello; "from example"; end
  remove_method :hello
end

Example.new.hello # => "from parent"

class Example
  undef_method :hello
end

Example.new.hello # => NoMethodError
```

* `remove_method` удаляет определение из текущего класса. После этого поиск может найти одноимённый метод у предка.
* `undef_method` запрещает поиск метода с этим именем через текущий класс, в том числе у предков. Определение в `Parent` при этом остаётся на месте.

---

## 🎯 send, public_send и __send__

```ruby
"Ruby".send(:upcase)        # => "RUBY"
"Ruby".public_send(:upcase) # => "RUBY"
"Ruby".__send__(:upcase)    # => "RUBY"
```

На публичном методе результат одинаков. Разница проявится при вызове приватного метода:

* `send` позволяет вызвать и приватный метод.
* `public_send` вызывает только публичные методы; попытка вызвать приватный метод завершится `NoMethodError`.
* `__send__` ведёт себя как `send` и полезен, если объект переопределил метод `send`.

Если имя метода поступает извне, одного `public_send` недостаточно для ограничения доступных действий: при необходимости проверяйте имя по списку разрешённых методов.

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

Эти методы позволяют получать, проверять и задавать константы во время выполнения. По умолчанию `const_get` и `const_defined?` могут учитывать унаследованные константы; второй аргумент `false` ограничивает поиск константами самого класса или модуля.

---

## 🧨 Комбо-подвох

```ruby
class A
  const_set(:B, Class.new)
end

puts A::B.name        # => A::B
puts A.const_get(:C)  # => NameError
```

`const_set` присваивает созданному классу имя через константу `A::B`. А `const_get` не создаёт отсутствующую константу: если `C` не найдена, он вызывает `NameError`. Когда нужно лишь проверить наличие константы, используйте `const_defined?`.

---

🔚 **Вывод:** выбирайте инструмент по нужному поведению: удаление метода отличается от запрета его поиска, а динамический вызов — от вызова только публичного метода. Перед применением метапрограммирования стоит проверить эти различия на конкретном случае.