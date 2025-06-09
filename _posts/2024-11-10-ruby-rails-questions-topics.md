---
layout: post
subtitle: <div id="terminal"></div>
title:  "Острые темы по Ruby и Rails, которые спрашивают на техническом интервью Middle/Senior"
date:   2024-11-10 09:00:00 +0300
rate: 5
tags: Ruby,PostgreSQL,Rails,ORM,метапрограммирование,оптимизация запросов
version: A49X3
categories:
  - rails
  - architecture
toc: true
menubar_toc: true
hero_image: /images/rails.jpg
hero_darken: true
---
Ruby, PostgreSQL и Rails — мощный стек для разработки, но даже опытные разработчики сталкиваются с тонкостями: от метапрограммирования в Ruby до оптимизации запросов в PostgreSQL. В этой статье собраны ключевые темы — от основ ORM до архитектурных решений и блокировок в базе данных.

---

## 🧠 Ruby

* [lambda, proc, yield и return: кто куда уходит](/posts/lambda-vs-proc.html)
* [method\_missing и respond\_to\_missing?](/posts/method-missing.html)
* [Метапрограммирование в Ruby: define\_method и друзья](/posts/define-methods.html)
* [send, **send**, public\_send — и когда всё рушится](/posts/ruby-terms.html)
* [@, @@ и \$ — переменные, в которых легко потеряться](/posts/variable-soup.html)

## 🔬 Ruby внутри

* [Что такое singleton\_class и class << self](/posts/singleton-class.html)
* [GIL, MJIT, YJIT, RJIT и почему Ruby всё ещё не летает](/posts/ruby-terms.html)
* [Ractor: попытка Ruby в многопоточность](/posts/ruby-ractor-3-4.html)
* [refine и BasicObject — странности ядра](/posts/ruby-weirdness.html)

## 🗄 ActiveRecord

* [joins, includes и preload — кто есть кто](/posts/rails-orm.html)
* [pluck(\:id) или select(\:id)? Поговорим про плохие практики](/posts/rails-orm-pluck.html)
* [Почему пропадают поля при select("...")](/posts/select-breaks-model.html)
* [scopes, merge, default\_scope — и как не взорваться](/posts/scopes-merge-unscope.html)
* [select, group, having, joins — и когда всё ломается](/posts/group-joins-merge-traps.html)
* [Нестабильные include + where — что с этим делать](/posts/rails-orm-mistakes.html)

## 💥 ORM и боль

* [Транзакции и подводные камни в PostgreSQL](/posts/postgresql-transactions-in-rails.html)
* [Блокировки в PostgreSQL: shared, exclusive, advisory](/posts/postgresql-locks-in-rails.html)
* [Пессимистичная vs оптимистичная блокировка](/posts/locking-optimistic-vs-pessimistic.html)
* [10 ошибок ORM, о которых вы пожалеете](/posts/rails-orm-mistakes.html)
* [EXPLAIN ANALYZE: читаем, не паникуем](/posts/explain-analyze-buffers.html)
* [Виды JOIN и почему всё тормозит](/posts/join-slowness-after-threshold.html)
* [Почему staging-база должна быть огромной](/posts/stage-database-size-matters.html)
* [Новая миграция, старые грабли: без strategy!](/posts/bad-index-migration.html)
* [Индексы в PostgreSQL и в ActiveRecord](/posts/postgresql-index-types-in-rails.html)
* [JSONB и запросы вида metadata @> ?](/posts/postgres-jsonb-query-magic.html)
* [Arel — магия или ад?](/posts/rails-arel-secret-power.html)

## 🏗 Архитектура
* [CQRS, Event sourcing и DDD в микросервисах на Rails](/posts/architecture-cqrs-ddd.html)
* [Service Object, Interactor и Command-подход](/posts/service-object-interactor-command.html)
* [Почему нельзя просто взять current\_user](/posts/why-not-current-user.html)
* [Как мы переехали на event-driven](/posts/moving-to-event-driven.html)
* [Почему default\_scope = боль](/posts/default-scope-pain.html)
