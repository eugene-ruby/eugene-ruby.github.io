---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Service Object в Ruby: когда `.call` уже не справляется'
date: '2024-09-17 12:00:00 +0300'
categories:
- pattern
- ruby
tags: Ruby on Rails,Service Object,бизнес-логика,PostgreSQL,DevOps,масштабируемость
rate: 4
hero_image: "/images/posts/background_post-0020.webp"
---
Service Object в Ruby on Rails — это мощный инструмент для вынесения сложной бизнес-логики из контроллеров и моделей, помогающий соблюдать принцип единой ответственности. В статье разберём, как правильно проектировать сервисные объекты, избегая типичных ошибок, и покажем их интеграцию с PostgreSQL и DevOps-практиками для масштабируемых приложений.

---
Итак, у нас есть `CreateUser.call(params)`…  
А потом: `create_wallet`, `send_email`, `notify_crm`, `log_event`, `raise_if_duplicate`.  
И всё это — в одном `Command`. Что ж, значит пришло время для **Service Object**.

---

## 🧠 Теория: что такое Service Object?

Service Object — это объект, отвечающий за **бизнес-процесс**.  
Обычно он реализует метод `.call` или `#call`, который выполняет сразу несколько связанных операций.

Он **координирует действия**, может вызывать команды, работать с внешними API, и при этом остаётся **тестируемым и изолированным**.

---

## 🔧 Пример

```ruby
class Users::SignupService
  def initialize(params)
    @params = params
  end

  def call
    user = User.create!(@params)
    Wallet.create!(user: user)
    SendWelcomeEmail.call(user)
    CrmNotifier.new(user).notify_signup
    user
  end
end
````

Вызывается:

```ruby
Users::SignupService.new(params).call
```

---

## 💡 Когда применять?

Service Object нужен, если:

* Операция **многосоставная**: несколько шагов, зависимостей, моделей.
* Нужна **явная последовательность действий** (как в скрипте).
* Требуется **разделение ответственности**: контроллер → сервис → команды/API.

Он хорош в местах, где **"не хочу, чтобы это было в контроллере, и не в модели тоже"**.

---

## 🧪 Пример теста

```ruby
describe Users::SignupService do
  it "создаёт пользователя и кошелёк" do
    params = attributes_for(:user)
    expect {
      described_class.new(params).call
    }.to change(User, :count).by(1)
      .and change(Wallet, :count).by(1)
  end
end
```

Можно замокать вызовы API, логеров и e-mail отправщиков — и получить предсказуемый unit-тест.

---

## 🔥 Когда это превращается в антипаттерн

| Случай                                                         | Почему это плохо                |
| -------------------------------------------------------------- | ------------------------------- |
| В сервисе 300 строк, 5 уровней вложенности                     | Он мутировал в god-object       |
| Сервис сам создаёт контроллер, модель, команду                 | Нарушение инверсии зависимостей |
| В проекте 1000 сервисов с названиями `UserCreateStep42Service` | Архитектура ради архитектуры    |

Ещё одна боль: **неоднозначные namespace'ы**. Где искать `BanUserService` — в `app/services/ban/`, `users/`, `actions/`?. Придётся договориться.

---

## 🎤 Что сказать на собесе

> — Почему вы не пишете всю логику в моделях?

— Мы выносим сложные сценарии в сервисы: это делает код проще, уменьшает ответственность моделей, и улучшает покрытие тестами.

---

## 🧾 Вывод

**Service Object — ваш рабочий верблюд для бизнес-логики.**
Он вытаскивает контроллеры из болота `begin/rescue`, модели — из жирных колбэков, а вас — с продакшена 31 декабря в 23:50.
