---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Rails 7.2: главное за 5 минут'
date: '2024-12-04 12:00:00 +0300'
categories:
- rails
tags: Ruby on Rails,Rails 7.2,YJIT,Hotwire,Active Record,DevOps
rate: 4
hero_image: "/images/posts/background_post-0044.webp"
---
Rails 7.2 продолжает укреплять позиции фреймворка, предлагая разработчикам улучшенную производительность благодаря YJIT, стабильность Hotwire и оптимизации Active Record. Этот релиз делает работу с Ruby on Rails ещё удобнее, сохраняя при этом совместимость с современными версиями Ruby и инструментами DevOps.


---

## ⚡ YJIT включён по умолчанию

Если вы запускаете Rails на **Ruby 3.3+**, флаг `--yjit` включается автоматически.

- Никаких флагов — просто запускаешь `rails s`, и оно быстрее
- Отключить: `RUBYOPT=--disable-yjit`

---

## 💡 Hotwire стал стабильным

- Turbo и Stimulus официально считаются стабильными
- Rails теперь рекомендует Hotwire как основной front-end стек по умолчанию

---

## 🚀 Zeitwerk быстрее

- Новая версия загрузчика кода работает быстрее и надёжнее
- Поддержка более строгой типизации и Ruby 3.x

---

## 🧠 Active Record

- `ActiveRecord::Relation#in_order_of` теперь стабилен
- Поддержка `Enum.map` для enum значений
- Оптимизации в `insert_all`, `upsert_all`

---

## 🔐 Security: Защита от утечек через exception messages

- Сообщения ошибок больше не "подглядывают" за аттрибутами (опционально)
- Лучше совместим с production-friendly логированием

---

## 🧰 Утилиты и мелочи

- Новый `bin/setup` включает больше хаков из коробки
- `rails new` умеет настраивать Docker и `tailwindcss` прямо при генерации
- Улучшены error pages (`rails dev:errors`)

---

## ⛓️ Совместимость

- Требуется Ruby >= 2.7, но **оптимально использовать 3.2+**
- Turbo, Stimulus и Rails 7.2 отлично работают с Ruby 3.3 + YJIT

---

🔚 **Вывод:**
Rails 7.2 не переворачивает стол — но улучшает стабильность, скорость и dev-опыт.  
Если вы на 7.0 или 7.1 — обновление не принесёт боли, а только плюсы.

_Полные релиз-ноты: [guides.rubyonrails.org/7_2_release_notes.html](https://guides.rubyonrails.org/7_2_release_notes.html)_
