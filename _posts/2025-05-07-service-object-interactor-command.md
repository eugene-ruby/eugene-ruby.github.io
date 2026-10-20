---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Service Object, Interactor и Command-подход: кто во что обернут'
date: '2025-05-07 11:00:00 +0300'
categories:
- architecture
- rails
tags: Ruby on Rails,Service Object,Interactor,Command,бизнес-логика,сервисный слой
rate: 4
hero_image: "/images/posts/background_post-0065.webp"
---
Сервисные объекты в Ruby on Rails помогают вынести бизнес-логику из контроллеров, делая код чище и тестируемее. В статье разбираем три популярных подхода — Service Object, Interactor и Command — с примерами реализации и рекомендациями по выбору для разных сценариев. Узнайте, как правильно организовать сервисный слой в вашем Rails-приложении, чтобы упростить поддержку и масштабирование.

---

Когда в контроллере стало слишком душно — на сцену выходит **сервисный слой**.  
Но кого выбрать: простой `Service Object`, паттерн `Command` или gem `interactor`?

## 🧱 Service Object

Класс с одним публичным методом `call`, который выполняет бизнес-логику. Простой и честный:

```ruby
class RegisterUser
  def initialize(params)
    @params = params
  end

  def call
    User.create!(@params)
  end
end
````

Вызов: `RegisterUser.new(params).call`

---

## 🧙‍♂️ Interactor

Если нужен `context`, `fail!`, и цепочка вызовов — поможет gem [`interactor`](https://github.com/collectiveidea/interactor).

```ruby
class RegisterUser
  include Interactor

  def call
    user = User.create(context.params)
    context.fail!(error: "bad data") unless user.persisted?
    context.user = user
  end
end
```

Вызов: `RegisterUser.call(params: ...)`
В цепочке: `Organizer.call(...)`

---

## 🧾 Command-подход

Похож на `Service`, но делает упор на **явность**, **сигнатуру** и **инварианты**:

```ruby
class RegisterUser < BaseCommand
  def call
    validate_input!
    create_user!
  end
end
```

Здесь можно добавлять события, телеметрию, аудит и прочие радости жизни.

---

## 🚦 Когда использовать

| Сценарий                           | Подход         |
| ---------------------------------- | -------------- |
| Быстро обернуть бизнес-логику      | Service Object |
| Хочется fail! и цепочек            | Interactor     |
| Инфраструктура с логгерами, events | Command-подход |

---

## 💬 Вывод

Любой из подходов лучше, чем класть бизнес-логику в контроллер.
Выбирай, исходя из сложности проекта — и не бойся писать обёртку над обёрткой, если это улучшает читаемость.
