---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby: fork, Parallel, Ractor и async — когда GIL не пройдёт'
date: '2023-10-10 13:00:00 +0300'
categories:
- performance
- ruby
tags: Ruby,параллельность,GIL,процессы,асинхронность,Ractor
rate: 3
hero_image: "/images/posts/background_post-0041.webp"
---
Ruby предлагает несколько подходов для достижения параллельности, несмотря на ограничения GIL. В этой статье разберёмся, как использовать процессы через fork, асинхронные библиотеки и новые возможности вроде Ractor, а также когда стоит перейти на альтернативные реализации Ruby вроде JRuby.

---

В прошлой статье мы выяснили, что потоки в MRI Ruby — это вежливый обман.  
А что делать, если **нужна настоящая параллельность**? Использовать **процессы**, **асинхронщину**, и **альтернативные VM**. Сегодня поговорим о:

- `fork`
- гемах типа `Parallel`
- `Ractor` (в Ruby 3+)
- и немного `async`, `httpx`, `falcon`

---

## 🧠 fork — создаём процессы

```ruby
pid = fork do
  puts "Я дочерний процесс, мой PID #{Process.pid}"
  sleep 1
end

puts "Я родитель, PID #{Process.pid}"
Process.wait(pid)
````

* `fork` создаёт **новый процесс**, копию текущего.
* В отличие от потоков — это настоящая параллельность (на уровне ОС).
* Работает **только в Unix-системах** (не Windows).

---

## ⚙️ Parallel — гем, который абстрагирует `fork`

```ruby
require 'parallel'

results = Parallel.map([1, 2, 3, 4], in_processes: 4) do |i|
  i * i
end

puts results.inspect # => [1, 4, 9, 16]
```

* `Parallel.map` запускает код в `fork`-процессах.
* Есть `in_threads`, но `in_processes` — без GIL.

---

## 🧬 Ractor (Ruby 3+)

```ruby
r = Ractor.new do
  val = Ractor.receive
  Ractor.yield val * 2
end

r.send(21)
puts r.take # => 42
```

* **Ractor** — новый механизм параллельности в Ruby 3.
* Каждый `Ractor` имеет свой изолированный объектный мир.
* **Без GIL** — параллельное выполнение Ruby-кода возможно.
* Минус: жёсткие ограничения (объекты должны быть "shareable").

---

## 🌊 async — асинхронность без потоков

```ruby
require 'async'
require 'net/http'

Async do
  3.times do
    Async do
      puts Net::HTTP.get(URI("https://example.com"))
    end
  end
end
```

* Библиотека [`async`](https://github.com/socketry/async)
* Реализует **кооперативную многозадачность**, как `async/await` в JS.
* Не блокирует потоки, пока ждёт I/O.

---

## 🚀 Falcon и HTTPX

* [`falcon`](https://github.com/socketry/falcon) — асинхронный Rack-сервер на основе `async`.
* [`httpx`](https://github.com/honeyryderchuck/httpx) — HTTP/2-клиент с async-поддержкой.

Идеальны для **высоконагруженных I/O приложений** — чат-ботов, стриминга, пушей и т.д.

---

## 🤖 А если нужен реально многопоточный Ruby?

* **JRuby** — Ruby на JVM: потоки = настоящие Java-потоки, GIL нет.
* **TruffleRuby** — часть GraalVM, потенциально поддерживает конкурентность.
* **Rubinius** — попытка сделать Ruby без GIL (уже не развивается активно).

---

## 🧨 Что могут спросить на собесе?

> “Как ты реализуешь CPU-bound парралельную обработку в MRI?”

Ответ:

* **fork** через `Parallel` (если Unix)
* Или использовать JRuby/TruffleRuby
* Ractor — в теории, но ещё сырой

---

🔚 **Вывод:**
MRI Ruby не про параллельность, но обходные пути есть. Важно знать, **что когда применять**:

| Задача              | Что использовать           |
| ------------------- | -------------------------- |
| I/O-bound           | `Thread`, `async`, `httpx` |
| CPU-bound (в MRI)   | `fork`, `Parallel`         |
| CPU-bound (без MRI) | `JRuby`, `TruffleRuby`     |
| Хардкор-изоляция    | `Ractor`                   |
