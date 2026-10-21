---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: Темы по Ruby, Rails и PostgreSQL для подготовки к техническому интервью Middle/Senior
short_description: 'Подборка статей для подготовки к техническому интервью по Ruby
  и Rails: особенности языка, запросы ActiveRecord, транзакции и блокировки PostgreSQL,
  архитектурные подходы.'
date: '2024-11-10 09:00:00 +0300'
categories:
- rails
- architecture
tags: Ruby,PostgreSQL,Rails,ORM,метапрограммирование,оптимизация запросов
rate: 5
hero_image: "/images/posts/background_post-0009.webp"
---
Ruby, PostgreSQL и Rails — мощный стек для разработки, но даже опытные разработчики сталкиваются с тонкостями: от метапрограммирования в Ruby до оптимизации запросов в PostgreSQL. Ниже — подборка материалов для подготовки к техническому интервью Middle/Senior: особенности языка, ActiveRecord, работа с базой данных и архитектурные решения.

---

## 🧠 Ruby

* [lambda, proc, yield и return: кто куда уходит](/posts/lambda-vs-proc.html)
* [method\_missing и respond\_to\_missing?](/posts/method-missing.html)
* [Метапрограммирование в Ruby: define\_method и друзья](/posts/define-methods.html)
* [send, \_\_send\_\_, public\_send — и когда всё рушится](/posts/ruby-terms.html)
* [@, @@ и \$ — переменные, в которых легко потеряться](/posts/variable-soup.html)

## 🔬 Ruby внутри

* [Что такое singleton\_class и class << self](/posts/singleton-class.html)
* [GIL, MJIT, YJIT, RJIT и почему Ruby всё ещё не летает](/posts/ruby-terms.html)
* [Ractor: параллельное выполнение в Ruby](/posts/ruby-ractor-3-4.html)
* [refine и BasicObject — странности ядра](/posts/ruby-weirdness.html)

## 🗄 ActiveRecord

* [joins, includes и preload — кто есть кто](/posts/rails-orm.html)
* [pluck(\:id) или select(\:id)? Поговорим про плохие практики](/posts/rails-orm-pluck.html)
* [Почему пропадают поля при select("...")](/posts/select-breaks-model.html)
* [scopes, merge, default\_scope — и как не взорваться](/posts/scopes-merge-unscope.html)
* [select, group, having, joins — и когда всё ломается](/posts/group-joins-merge-traps.html)
* [Нестабильные includes + where — что с этим делать](/posts/rails-orm-mistakes.html)

## 💥 ORM и боль

* [Транзакции и подводные камни в PostgreSQL](/posts/postgresql-transactions-in-rails.html)
* [Блокировки в PostgreSQL: shared, exclusive, advisory](/posts/postgresql-locks-in-rails.html)
* [Пессимистичная vs оптимистичная блокировка](/posts/locking-optimistic-vs-pessimistic.html)
* [10 ошибок ORM, о которых вы пожалеете](/posts/rails-orm-mistakes.html)
* [EXPLAIN ANALYZE: читаем, не паникуем](/posts/explain-analyze-buffers.html)
* [Виды JOIN и почему всё тормозит](/posts/join-slowness-after-threshold.html)
* [Почему размер staging-базы имеет значение](/posts/stage-database-size-matters.html)
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