---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Ruby 3.0 → 3.4: что добавили, что убрали, что изменилось'
date: '2025-03-10 11:30:00 +0300'
categories:
- performance
- ruby
tags: Ruby,Rails,PostgreSQL,DevOps,Ractor,Pattern Matching
rate: 3
hero_image: "/images/posts/background_post-0009.webp"
---
Ruby продолжает развиваться, предлагая разработчикам новые инструменты для работы с параллелизмом, улучшенную производительность и удобные синтаксические конструкции. В этой статье мы рассмотрим ключевые изменения в версиях Ruby 3.x, которые помогут вам эффективнее использовать язык в проектах с Rails, PostgreSQL и современными DevOps-практиками.

---

Ruby 3.x — это не просто семантический апдейт. Это эволюция языка: от улучшений в производительности до новых фич типа `Ractor`, `Pattern Matching`, `Data` и `Fiber.schedule`.

В этой статье — **шпаргалка** по версиям Ruby от 3.0 до 3.4: без воды, только факты.

## 🧾 Ruby 3.0 (декабрь 2020)

🎯 **Цель: Ruby 3x3** — в 3 раза быстрее, чем Ruby 2.0

### 🔹 Главное:
- 💬 **Ractor** — безопасный параллелизм
- 🔥 **Fiber Scheduler API** — фундамент для async/await
- 📦 **Pattern Matching** стал стабильным (из 2.7)
- ⏱️ Улучшения JIT (MJIT)
- ✅ `...` теперь работает как аргумент по умолчанию в методах

---

## ⚙️ Ruby 3.1 (декабрь 2021)

### 🔹 Главное:
* 📦 `Enumerable#tally` → частотный анализ
* 🧪 **Experimental: `debug` gem** — дебаггер нового поколения
* 🧱 MJIT → Rewrite на C
* 📛 Deprecation: `lambda.call(...)` без скобок теперь вызывает warning

---

## 🧰 Ruby 3.2 (декабрь 2022)

### 🔹 Главное:

* 💠 Появился `Data` — базовый класс для простых неизменяемых объектов-значений, похожий на `Struct`.
* 🔒 Экземпляр `Data` можно передавать между Ractor, только если его поля shareable; иначе сначала нужно обеспечить их совместимость.
* ⚙️ YJIT перестал быть экспериментальным в Ruby 3.2.
* ⚙️ **YJIT** стал стабильным и включаемым из коробки
* 🧵 `Thread#join` возвращает `self`
* 💬 `Regexp#match?` → быстрее и безопаснее
* 🚫 Удалены: `Time#to_time`, `Time#getlocal(arg)` и другие устаревшие API

---

## 🚀 Ruby 3.3 (декабрь 2023)

### 🔹 Главное:

* ⚙️ **YJIT включён по умолчанию** (на Linux/macOS)
* 📦 **Gemified stdlib** — многие стандартные библиотеки больше не встроены, а ставятся отдельно (`net/http`, `uri`, `csv`, и т.д.)
* 🧼 `Dir.children`, `Dir.each_child` стали быстрее
* 🧠 `SyntaxError` теперь выводит конкретный код, а не просто "unexpected end"
* 🚫 Удалено: `Proc.new &block` (устаревшее поведение)

---

## 🔬 Ruby 3.4 (декабрь 2024)

### 🔹 Главное:

* ⚙️ **Ractor улучшен**:

    * `Ractor.make_shareable`
    * `Ractor::MovedObject` теперь меньше пугает
* 📈 **YJIT улучшен** (еще меньше прогрева)
* 📦 **New stdlib layout**:

    * core, default, bundled, gems
    * можно посмотреть через `Gem::Specification`
* 🧃 `Array#intersect?`, `Hash#except`, `Object#with` — удобные методы
* 🚫 `Enumerator::Chain` частично заменён `Enumerable#chain`

---

## 💡 Общие тренды Ruby 3.x

| Категория          | Направление                             |
| ------------------ | --------------------------------------- |
| Производительность | MJIT, YJIT, Fiber.schedule              |
| Безопасность       | Ractor, shareable objects               |
| Синтаксис          | Pattern Matching, endless method def    |
| Удаления           | Устаревшие API, implicit block handling |
| Стандартизация     | Больше "гемофикации" stdlib             |

---

🔚 **Вывод:**
Ruby 3.x — это больше, чем "новая версия". Это движение в сторону реальной конкурентности, удобства и скорости.
Да, что-то отрезали. Но добавили гораздо больше — и всё это можно использовать уже сегодня.
