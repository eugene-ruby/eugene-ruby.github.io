---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: CQRS, Event Sourcing и DDD в микросервисах на Rails
date: '2024-12-01 10:00:00 +0300'
categories:
- architecture
- rails
tags: Ruby,PostgreSQL,Rails,DevOps,базы данных,оптимизация запросов
rate: 4
hero_image: "/images/posts/background_post-0015.webp"
---
Ruby, PostgreSQL и Rails — мощный стек для разработки, но без правильного DevOps-подхода даже лучший код может стать проблемой. В этой статье разберём ключевые аспекты работы с базами данных, оптимизацию запросов и deployment-стратегии для Ruby-приложений.

---
Когда вы переходите от монолита к микросервисам, старые подходы начинают скрипеть. Прямые апдейты моделей, простые CRUD-контроллеры, ActiveRecord-колдунство — всё это начинает мешать. На сцену выходят три знакомых аббревиатуры: CQRS, Event Sourcing и DDD.

## 🧠 Зачем это вообще нужно

ActiveRecord отлично работает, пока вы не пытаетесь разделить бизнес-логику и хранение. Но как только появляется потребность:

* в **разделении команд и запросов** (например, одни сервисы только пишут, другие только читают)
* в **событийной архитектуре**, где изменения надо отслеживать и передавать
* в **контексте доменов**, где одна сущность может значить разное в разных частях системы

... становится ясно: пора вносить ясность и разделять ответственность.

---

## 🟪 CQRS: Command Query Responsibility Segregation

CQRS делит вашу архитектуру на две части:

* **Команды** (Command) — меняют состояние, но ничего не возвращают (в идеале)
* **Запросы** (Query) — читают данные, но не меняют их

Пример:

```ruby
class CreateUserCommand
  def call(name:, email:)
    User.create!(name: name, email: email)
  end
end

class UserQuery
  def self.active
    User.where(active: true)
  end
end
```

---

## 🟧 Event Sourcing: не меняем — фиксируем

Вместо сохранения последнего состояния, мы сохраняем **все события**, которые к нему привели:

```ruby
UserEvent.create!(type: 'created', data: {name: 'Alice'})
UserEvent.create!(type: 'activated', data: {})
```

И потом **воспроизводим** состояние из этих событий.

**Плюсы:**

* идеальная аудитория изменений
* гибкая откатка состояния
* проще интеграция между сервисами

---

## 🟥 DDD: Domain Driven Design

Сложные системы не строятся вокруг базы данных. Они строятся вокруг **бизнес-доменов**.

DDD предлагает:

* выделять **контексты** (bounded contexts)
* не тащить AR-модели везде, а строить **value objects** и **domain logic**
* использовать **domain events** как интерфейс общения

Пример:

```ruby
class ActivateUser < ApplicationCommand
  def call(user:)
    return failure('already active') if user.active?

    user.activate!
    publish(UserActivated.new(user_id: user.id))
  end
end
```

---

## 💡 В Rails это возможно

Ты можешь сохранить любимые миграции, ActiveRecord и rake задачи. Главное — отделить:

* Писатели от читателей
* Базу от бизнес-логики
* Команды от событий

И тогда микросервисы не будут похожи на монолит, распиленный по HTTP.
