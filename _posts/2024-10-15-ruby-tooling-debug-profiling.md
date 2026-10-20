---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: Debug, Benchmark, StackProf — как Ruby помогает себе сам
date: '2024-09-18 12:00:00 +0300'
categories:
- performance
- ruby
tags: Ruby,Debug,Benchmark,StackProf,отладка,производительность
rate: 3
hero_image: "/images/posts/background_post-0030.webp"
---
Вы когда-нибудь видели, как разработчик пытается отладить код, добавляя `puts` на каждом шаге? Это как искать чёрную кошку в тёмной комнате, особенно если кошка — это утечка памяти в продакшене. К счастью, Ruby даёт нам целый арсенал инструментов для самодиагностики. Сегодня разберём три кита: **Debug**, **Benchmark** и **StackProf** — и научимся не тыкать в код наугад.

---

## 🐞 Debug: когда puts уже не смешно

### Теория: зачем нужен дебаггер?

`puts` — это как кричать "Эй, я здесь!" в космосе. А дебаггер — это GPS с голосовыми подсказками. В Ruby 3.1+ появился встроенный `debug` гем, который делает отладку осознанной.

**Проблема**:  
```ruby
# app/services/payment_processor.rb
def process
  validate_amount! # падает где-то здесь... но где именно?
  charge_card
  create_invoice
end
```

**Решение**:  
```ruby
require "debug"

def process
  debugger # точка остановки
  validate_amount!
  binding.break # альтернативный синтаксис
  charge_card
end
```

Запускаем с `rdbg` и получаем:
- интерактивную консоль
- просмотр стека вызовов
- изменение переменных на лету

---

### Антипаттерны дебага

1. **"puts-driven development"**  
   ```ruby
   puts "Дошёл сюда, user_id = #{user.id}" # А потом забыли удалить
   ```
2. **Дебаг в продакшене**  
   Никогда не оставляйте `binding.pry` в коде. Серьёзно, никогда.

---

## ⏱ Benchmark: измеряем правильно

### Теория: почему Time.now — плохая идея

Замер времени через `Time.now` — это как измерять температуру подмышкой: примерные цифры, но не точные. В Ruby есть `Benchmark` из стандартной библиотеки.

**Проблемный код**:  
```ruby
start = Time.now
1000.times { User.where(active: true).to_a }
puts "Затрачено: #{Time.now - start} секунд"
```

**Правильный замер**:  
```ruby
require "benchmark"

result = Benchmark.measure do
  1000.times { User.where(active: true).load }
end

puts result
#=> 0.020000   0.000000   0.020000 (  0.025678)
```
Вывод:  
- user CPU time  
- system CPU time  
- общее время  
- реальное время

---

### Практика: Benchmark IPS

Для сравнения двух подходов используем `benchmark-ips`:

```ruby
require "benchmark/ips"

Benchmark.ips do |x|
  x.report("with to_a") { User.where(active: true).to_a }
  x.report("with load") { User.where(active: true).load }
  x.compare!
end
```

Вывод:
```
Comparison:
       with load:      462.5 i/s
       with to_a:      428.6 i/s - 1.08x slower
```

---

## 🔥 StackProf: находим узкие места

### Теория: профайлинг — это не роскошь

Когда приложение тормозит, но непонятно где — нужен профайлер. `stackprof` — sampling-профайлер для Ruby, который показывает:

- Где тратится CPU
- Какие методы вызываются чаще всего
- Где память утекает как вода

**Установка**:  
```bash
gem install stackprof
```

**Запуск**:  
```ruby
require "stackprof"

StackProf.run(mode: :cpu, out: "tmp/stackprof.dump") do
  # ваш медленный код
end
```

---

### Анализ результатов

1. **Текстовый отчёт**:  
   ```bash
   stackprof tmp/stackprof.dump --text
   ```
   Покажет что-то вроде:
   ```
   Samples: 1000 (0.00% miss rate)
   GC: 50 (5.00%)
   TOTAL    (pct)     SAMPLES    (pct)     FRAME
     300  (30.0%)         200  (20.0%)     ActiveRecord::Relation#to_a
   ```

2. **Flamegraph**:  
   ```bash
   stackprof --flamegraph tmp/stackprof.dump > tmp/flamegraph.json
   ```
   И открываем в https://speedscope.app

---

### Боль: когда профайлинг врет

1. **Слишком короткие тесты**  
   Если код выполняется меньше 100мс, sampling может дать некорректные результаты.

2. **Эффект наблюдателя**  
   Сам факт профайлинга замедляет выполнение кода.

---

## 🧪 Комбо: Debug + Benchmark + StackProf

**Реальный кейс**:  
API endpoint тормозит с 200мс до 2с под нагрузкой.

1. **Debugger**  
   Ставим точку остановки перед медленным участком, смотрим состояние объектов.

2. **Benchmark**  
   Замеряем отдельные компоненты:
   ```ruby
   Benchmark.measure { Order.preload(:items).where(user: user) }
   ```

3. **StackProf**  
   Запускаем профайлер на полном запросе, находим N+1 запросы или рекурсию.

---

## 🎁 Выводы

1. **Debug** — для точечной отладки сложных сценариев  
2. **Benchmark** — когда нужно сравнить два подхода  
3. **StackProf** — для поиска узких мест в продакшене  

Как сказал один мудрый разработчик:  
*"Если бы Ruby умел говорить, он бы сам сказал, где у него болит. Но пока что у нас есть эти инструменты."*

P.S. И да, удалите наконец эти `puts` из кода.
