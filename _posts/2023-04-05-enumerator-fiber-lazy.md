---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: Enumerator, Lazy, Fiber — искусство не делать лишнего'
date: '2023-04-05 13:00:00 +0300'
categories:
- ruby
tags: Ruby,итераторы,Enumerator,Lazy,Fiber,ленивые вычисления
rate: 5
hero_image: "/images/posts/background_post-0021.webp"
---
Итераторы в Ruby — мощный инструмент, выходящий далеко за рамки простого `each`. В статье разберём, как работают `Enumerator`, `Lazy` и `Fiber` под капотом, почему ленивые вычисления экономят память и как это применяется в Rails-приложениях. Вы узнаете, как эффективно обрабатывать большие данные и писать выразительный код без лишних вычислений.

---

## 🪜 Что такое Enumerator?

```ruby
enum = [1, 2, 3].each
puts enum.class # => Enumerator

enum.each { |x| puts x }
````

`Enumerator` — это ленивый итератор, который можно:

* сохранить в переменную,
* итерировать вручную,
* передать куда угодно.

---

## 🧃 `Enumerator::Lazy`

```ruby
lazy = (1..Float::INFINITY).lazy
        .select(&:even?)
        .map { |x| x * 10 }

puts lazy.first(5) # => [20, 40, 60, 80, 100]
```

**Ленивый цепной вызов** — выполняется **только по необходимости**.
Без `.lazy` — Ruby завис бы на `INFINITY`.

---

## 🧵 Fiber — ниточка управления

```ruby
f = Fiber.new do
  Fiber.yield "пауза 1"
  Fiber.yield "пауза 2"
  "завершено"
end

puts f.resume  # => пауза 1
puts f.resume  # => пауза 2
puts f.resume  # => завершено
```

**Fiber** — это мини-корутина: сохраняет состояние между вызовами. Используется внутри `Enumerator`, `Lazy`, и даже `Rails` (ActionCable).

---

## 🧬 Enumerator.create

```ruby
e = Enumerator.new do |yielder|
  yielder << 1
  yielder << 2
  yielder << 3
end

puts e.to_a # => [1, 2, 3]
```

`yielder` — объект класса `Enumerator::Yielder`, позволяет вручную отдавать значения.

---

## 📌 Сравнение

| Что          | Ленивый? | Сохраняет состояние? | Применение               |
| ------------ | -------- | -------------------- | ------------------------ |
| `each`       | нет      | нет                  | прямой вызов             |
| `Enumerator` | да       | да                   | генераторы, итераторы    |
| `Lazy`       | да       | да                   | бесконечные коллекции    |
| `Fiber`      | да       | да                   | асинхронность, генерация |

---

## 🧨 Вопрос на собесе

```ruby
enum = Enumerator.new do |y|
  3.times { |i| y << i }
end

puts enum.next  # => ?
puts enum.next  # => ?
puts enum.next  # => ?
puts enum.next  # => ?
```

**Ответ:**

```
0
1
2
StopIteration (на последнем вызове)
```

---

## 🧠 Почему это важно?

* **Enumerator** даёт контроль: можно остановить, возобновить, передать.
* **Lazy** позволяет обрабатывать большие (или бесконечные) коллекции.
* **Fiber** — база для кооперативной многозадачности (например, в сетевых библиотеках или `async`-джемах).

---

## 💡 Пример: обработка большого CSV лениво

```ruby
require 'csv'

File.open("big.csv") do |file|
  csv_enum = Enumerator.new do |y|
    file.each_line do |line|
      y << CSV.parse_line(line)
    end
  end

  csv_enum.lazy.select { |row| row[1] == "admin" }
          .first(10)
end
```

Ничего не читается в память заранее. Всё обрабатывается по запросу.

---

🔚 **Вывод:**
Ruby умеет быть ленивым — и это хорошо. Понимание `Enumerator`, `Lazy` и `Fiber` отличает кодера от архитектора. На собеседовании — покажи, что знаешь, когда не надо делать `each`.
