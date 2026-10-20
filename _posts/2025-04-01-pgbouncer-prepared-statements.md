---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'PgBouncer и Prepared Statements: медленная смерть Rails'
date: '2025-04-01 16:00:00 +0300'
categories:
- postgres
- rails
tags: Ruby on Rails,PostgreSQL,PgBouncer,prepared statements,transaction mode,performance
rate: 3
hero_image: "/images/posts/background_post-0011.webp"
---
При работе с Ruby on Rails и PostgreSQL важно учитывать особенности взаимодействия при использовании PgBouncer в режиме transaction, чтобы избежать ошибок вроде PG::ProtocolViolation. В этой статье разберём, почему возникают проблемы с prepared statements, как их избежать и какие альтернативы существуют для баланса между производительностью и стабильностью.

## 📉 Проблема

Вы ставите `PgBouncer` в режиме `transaction`, подключаете Rails — и всё вроде работает.  
А потом начинаются странности:

- **Непредсказуемые ошибки**
- **Сбои при миграциях**
- **Внезапно — `PG::ProtocolViolation`**

---

## 🧠 Почему так?

Rails по умолчанию использует **prepared statements** — это SQL-запросы, которые подготавливаются и кешируются на уровне соединения.

А **PgBouncer в режиме `transaction`** раздаёт **разные** соединения на каждый запрос.  
Значит — подготовленный запрос потерян.

---

## 🔥 Последствия

1. Запрос подготовлен на соединении A.
2. Следующий запрос уходит через соединение B.
3. PostgreSQL отвечает: «я не знаю, что за `$1`».
4. Получаем ошибку `PG::ProtocolViolation` или `PG::InvalidPreparedStatementName`.

---

## 🔧 Как решить

### ✅ Отключить prepared statements в Rails

Добавьте в `config/database.yml`:

```yaml
production:
  adapter: postgresql
  prepared_statements: false
````

### ✅ Или используйте режим `session` в PgBouncer

Но тогда теряется суть PgBouncer: **нет экономии соединений**.

---

## 🤔 А может оставить?

Если вы используете PgBouncer — **отключайте prepared statements** в Rails.
Они просто несовместимы в `transaction`-режиме, который и делает PgBouncer полезным.

---

## 🧩 Альтернатива?

PostgreSQL 14+ умеет **JIT**, а Rails с `prepared_statements: false` не сильно теряет в производительности, зато становится стабильнее.

---

## ✅ Вывод

* PgBouncer в режиме `transaction` несовместим с Rails по умолчанию.
* Хотите стабильности — отключите prepared statements.
* Хотите скорость — ставьте Redis 🫣
