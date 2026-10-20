---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: Многопоточность, которой нет — потоки, GIL и Mutex'
date: '2023-10-10 10:00:00 +0300'
categories:
- performance
- ruby
tags: Ruby,потоки,GIL,MRI,многопоточность,параллелизм
rate: 3
hero_image: "/images/posts/background_post-0024.webp"
---
Ruby — мощный язык с богатыми возможностями для работы с потоками, но его реализация в MRI имеет важную особенность: Global Interpreter Lock (GIL), который ограничивает параллельное выполнение Ruby-кода. Это делает потоки полезными для I/O-операций, таких как работа с сетью или базой данных, но не даёт преимуществ в CPU-задачах. В статье разберёмся, как эффективно использовать многопоточность в Ruby, какие подводные камни ждут разработчиков и какие альтернативы существуют для настоящего параллелизма.

---

## 🚧 Что такое GIL?

**GIL** — Global Interpreter Lock (в MRI Ruby это GVL: Global VM Lock).  
Он **не даёт двум Ruby-потокам исполнять Ruby-код одновременно**.

---

## 🤔 Тогда зачем вообще потоки?

- Они **полезны при I/O**: чтение файлов, сетевые запросы, ожидание БД.
- Они работают **асинхронно**, но не **параллельно**.
- Подходят для `sleep`, `gets`, `read`, `open-uri`, Net::HTTP и прочих.

---

## 🧪 Пример: работает с I/O

```ruby
threads = []

3.times do |i|
  threads << Thread.new do
    puts "Start #{i}"
    sleep 1
    puts "End #{i}"
  end
end

threads.each(&:join)
````

✅ Выполнится параллельно (в смысле задержек `sleep`), но не в 3 потока реального Ruby-кода.

---

## 🧨 Пример: не работает с CPU

```ruby
threads = []

3.times do
  threads << Thread.new do
    10_000_000.times { Math.sqrt(1234) }
  end
end

threads.each(&:join)
```

❌ Работает **медленнее, чем один поток**. GIL не даёт Ruby-коду выполняться параллельно.

---

## 🔐 Mutex и защита от гонок

```ruby
mutex = Mutex.new
counter = 0

threads = 10.times.map do
  Thread.new do
    1000.times do
      mutex.synchronize { counter += 1 }
    end
  end
end

threads.each(&:join)
puts counter  # => 10000
```

Без `Mutex` значение могло быть не то — гонка данных (`race condition`).

---

## 📦 Queue — потокобезопасная очередь

```ruby
q = Queue.new

producer = Thread.new do
  5.times { |i| q << i }
  q << :done
end

consumer = Thread.new do
  loop do
    val = q.pop
    break if val == :done
    puts "Got #{val}"
  end
end

[producer, consumer].each(&:join)
```

`Queue` — встроенная в Ruby и потокобезопасная структура для общения между потоками.

---

## 🧠 Так как же делать параллельность?

* Использовать **процессы**, а не потоки: `fork`, `Parallel`, `Process.spawn`
* Или альтернативные реализации Ruby:

    * **JRuby** — настоящая многопоточность
    * **TruffleRuby** — потенциал для конкурентности
* Или переключиться на многопоточность вне MRI: Rust, Go, Elixir 🤖

---

## ⚠️ На собеседовании могут спросить:

> “А как ты реализуешь параллельную загрузку 100 URLов в MRI Ruby?”

Ожидаемый ответ:

* `Thread` + `Net::HTTP` или `open-uri`
* Или `Typhoeus`, `HTTPX`, `async`
* Главное: не рассчитывать на ускорение CPU-задач

---

🔚 **Вывод:**
Ruby умеет делать **вид**, что у него есть потоки. Но не путай I/O с CPU.
В MRI — это многозадачность, а не многопоточность. Но для сервера, который ждёт пользователей или API, этого часто хватает с головой.
