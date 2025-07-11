---
layout: post
subtitle: <div id="terminal"></div>
title:  "Почему staging должен быть почти как прод. Или жди беды 31 декабря в 23:50"
date:   2025-01-28 12:00:00 +0300
rate: 3
tags: Ruby,PostgreSQL,ActiveRecord,SQL,тестирование,N+1
version: 3.2.2
categories:
  - postgres
toc: true
menubar_toc: true
hero_image: /images/posts/68.jpg
hero_darken: true
---
Тестирование на пустой базе staging — это как проверять работу двигателя на велосипеде, когда тебе предстоит гружёный КамАЗ. PostgreSQL и ActiveRecord могут вести себя совершенно по-разному в зависимости от объёма данных, кардинальности связей и индексов. Если не учитывать эти нюансы, даже простой SQL-запрос или рефакторинг кода способны превратить прод в ад из таймаутов, N+1 и Seq Scan на миллионы строк.

---

`SELECT COUNT(*) FROM users;`  
На проде: **1 258 917**  
На staging: **10**

Если у тебя такая картина — поздравляю: ты только что отключил себе 90% продовых багов от отлова на тестах.

## 🎯 Проблема

На staging всё летает. Новый SQL-запрос, рефакторинг или даже миграция — проходит за миллисекунды.  
А потом приходит **вечер 31 декабря**, и на проде:

- зависает воркер
- таймауты на API
- база уходит в swap
- всплывает `EXPLAIN` с `Seq Scan` на миллион строк

А ты ведь это тестировал… Но на пустой базе. Где даже `JOIN`'у было скучно.

---

## 🧠 Почему staging ≠ прод

**PostgreSQL и ActiveRecord ведут себя по-разному**, когда:

- меняется **объём** данных
- разные **кардинальности** (`users → posts`)
- отсутствуют **индексы** в `WHERE ... IN (10 ids)`
- статистика таблицы занижена

---

## 🧪 Что можно не заметить на пустом staging

| Проблема                    | На staging           | На проде                |
|----------------------------|----------------------|-------------------------|
| `N+1`                      | Быстро               | Взрывается в цикле      |
| `Seq Scan`                 | Мгновенно            | Читает 1М строк         |
| `Nested Loop`              | Нормально            | Убивает CPU             |
| `GROUP BY`, `DISTINCT`     | Маленький результат  | Падает в swap           |
| `COUNT(*)` без индекса     | Почти незаметно      | Таймаут в API           |

---

## ✅ Что делать

- **Загрузи staging данными** хотя бы в **10–30% от прода**
- Импортируй дамп, обрежь sensitive-данные
- Запускай тесты и `EXPLAIN` **именно там**
- Сделай cron: `pg_restore` с реплики → staging раз в неделю

---

## 🧨 Когда это взрывается

Чаще всего:

- ❄️ 31 декабря 23:50 (отчёты)
- 📦 Массовая рассылка
- 🚀 Новый релиз с забытым `.includes`
- 📊 Новый `dashboard` от продакта

---

📌 _Вывод_: staging — не для галочки. Он должен быть **боевой песочницей**, а не картонной коробкой.
