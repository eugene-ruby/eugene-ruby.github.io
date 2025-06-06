---
layout: post
title:  "EXPLAIN ANALYZE BUFFERS: читаем планы PostgreSQL как профи"
date:   2025-01-12 11:00:00 +0300
categories:
  - postgres
toc: true
menubar_toc: true
hero_image: /images/rails.jpeg
hero_darken: true
---

`EXPLAIN ANALYZE` — мощнейший инструмент для понимания, **почему ваш SQL тормозит**. А если добавить `BUFFERS` — вы увидите ещё и реальное потребление IO.

---

## 🚀 Пример

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM users WHERE id IN (
  SELECT user_id FROM posts WHERE published = true
);
````

---

## 📊 Что показывает план?

```text
Nested Loop  (cost=... rows=... width=...)
  -> Seq Scan on posts ...
  -> Index Scan using users_pkey on users ...
```

* `Nested Loop` — один из видов join-планов
* `Seq Scan` — полный просмотр таблицы
* `Index Scan` — использование индекса

---

## 📦 BUFFERS

Вывод покажет такие строки:

```
Buffers: shared hit=124 read=8 dirtied=0 written=0
```

Это значит:

* **hit=124** — данные уже были в памяти (shared\_buffers)
* **read=8** — данные считаны с диска
* **dirtied/written** — касаются записи

📌 Чем больше `read`, тем медленнее. Это **диск**.

---

## 💥 Почему Nested Loop — не всегда хорошо?

Если внешний SELECT возвращает много строк, а внутренний использует `Index Scan`,
то для **каждой строки** будет новый поиск по индексу — N раз.

📉 Это может быть в 1000 раз медленнее, чем `Hash Join`.

---

## 🛠 Что делать?

* Использовать `JOIN` вместо подзапроса
* Проверить индексы
* Использовать `EXPLAIN (ANALYZE, BUFFERS)` всегда, когда видишь тормоза

---

## 🤓 Полезные флаги

| Ключ        | Что даёт                                |
| ----------- | --------------------------------------- |
| `ANALYZE`   | Выполняет запрос и показывает **время** |
| `BUFFERS`   | Показывает, где читается/пишется        |
| `VERBOSE`   | Больше информации (колонки и пр.)       |
| `COSTS OFF` | Прячет cost и rows (чисто для глаз)     |

---

## 🧪 Совет

Всегда начинай с `EXPLAIN ANALYZE`, а если нужно копнуть глубже — добавь `BUFFERS`.
