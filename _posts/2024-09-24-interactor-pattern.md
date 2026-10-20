---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Interactor в Ruby: `.call!`, контекст и грязные руки'
date: '2024-09-24 12:00:00 +0300'
categories:
- pattern
- ruby
tags: Interactor,Ruby,Rails,бизнес-логика,Service-объекты,ошибки
rate: 3
hero_image: "/images/posts/background_post-0055.webp"
---
Interactor — это мощный инструмент для организации бизнес-логики в Rails-приложениях, который помогает структурировать сложные операции в цепочки шагов с поддержкой отката и валидации. Он особенно полезен, когда стандартные Service-объекты уже не справляются с управлением потоком выполнения и обработкой ошибок. В этой статье разберём, как эффективно использовать Interactor для чистого и предсказуемого кода.

----
Вы уже используете `.call`, и у вас десяток `Service`.  
Но в одном — ошибка на шаге 3, в другом хочется отменить шаг 2, а третий — возвращает `nil`, но никто не понимает, почему.

Пора знакомиться с **Interactor**.

---

## 🧠 Теория

**Interactor** — это паттерн (и gem), который оборачивает выполнение бизнес-операции в **контекст**, поддерживает **цепочки**, **rollback**, и **валидирует** входные данные.

Придумал его коллективом `collectiveidea`, и он прекрасно прижился в Rails-проектах, где нужно чуть больше, чем просто `.call`.

---

## ⚙️ Пример

```ruby
class CreateUser
  include Interactor

  def call
    context.user = User.create!(context.params)
    SendWelcomeEmail.call(context.user)
  rescue => e
    context.fail!(error: e.message)
  end
end
````

Вызов:

```ruby
result = CreateUser.call(params: {email: "user@example.com"})

if result.success?
  puts "Created: #{result.user.id}"
else
  puts "Ошибка: #{result.error}"
end
```

---

## 🔁 С цепочками

```ruby
class SignupFlow
  include Interactor::Organizer

  organize CreateUser, CreateWallet, NotifyCrm
end
```

Появляется управление: если один interactor вызвал `fail!`, все последующие шаги отменяются.

---

## ⛑ Когда использовать?

* Нужно **собрать последовательность действий** и контролировать поток
* Вы хотите **rollback по ходу выполнения**
* Важно возвращать **контекст** с результатом и ошибками
* Команды стали **слишком хрупкими** (ошибка в одном — рушит всё без логов)

---

## 🧱 Пример с rollback

```ruby
class ChargeCard
  include Interactor

  def call
    Payment.charge!(context.user, context.amount)
  end

  def rollback
    Payment.refund(context.user, context.amount)
  end
end
```

Если шаг после этого завершится через `fail!`, произойдёт откат.

---

## 🤯 Когда interactor — зло

| Случай                                               | Почему плохо                                              |
| ---------------------------------------------------- | --------------------------------------------------------- |
| У каждого interactor — по 1 строке                   | Переусложнение. Можно было обойтись `Command`.            |
| Вся логика в rollback                                | Признак хрупкости. Упрощайте шаги, а не компенсируйте их. |
| Используете `Interactor::Organizer` для всего подряд | Зависимость от фреймворка, непредсказуемый стек вызовов   |

---

## 📎 Советы из практики

* Контекст лучше делать **явным**: `context.user`, `context.params[:x]`, `context.error`
* **Не делайте interactor универсальным** — если он `DoEverything`, у вас не interactor, а intergalactic controller
* Пишите unit-тесты на каждый `.call`, а интеграционные — на `Organizer`

---

## 🎤 Что сказать на собесе

> — Чем Interactor отличается от Service?

— Interactor даёт стандарт на структуру, явный `context`, поддерживает rollback и цепочки. Хорош для сценариев с побочками и промежуточными результатами.

---

## 🧾 Вывод

**Interactor = Command + структура + контроль + rollback**
Если `.call` вас уже не спасает — interactor может помочь, особенно если вы хотите обернуть бизнес-логику в цепочку шагов, с откатом и логами.
