---
layout: post
subtitle: <div id="terminal"></div>
title:  "Паттерн Command в Ruby: `self.call`, чистые руки и немного магии"
date:   2024-05-06 15:00:00 +0300
rate: 4
tags: Ruby,Rails,PostgreSQL,DevOps,CI/CD,репликация
version: 3.2.2
categories:
  - pattern
  - ruby
hero_image: /images/posts/16.jpg
hero_darken: true
toc: true
menubar_toc: true
---
Ruby и Rails предлагают мощные инструменты для работы с базами данных PostgreSQL, а DevOps-практики помогают эффективно развертывать и масштабировать такие решения. В этой статье разберём ключевые аспекты интеграции этих технологий — от оптимизации запросов до настройки репликации и CI/CD-процессов. Вы узнаете, как строить отказоустойчивые приложения, используя лучшие практики Ruby-экосистемы.

---
Вы наверняка встречали этот код:

```ruby
class SendWelcomeEmail
  def self.call(user)
    new(user).call
  end

  def initialize(user)
    @user = user
  end

  def call
    Mailer.welcome(@user).deliver_later
  end
end
````

Он короткий, лаконичный и… выглядит так, будто его писал кто-то, кто читал про паттерны.
Это и есть **Command** — один из самых популярных архитектурных подходов в Ruby-мире. Давайте разберёмся, зачем он нужен и когда его лучше не использовать.

---

## 🧠 Теория: что такое Command?

Command (он же "Команда") — это поведенческий паттерн из классической "банды четырёх".
Он инкапсулирует действие и его параметры в объект. Это позволяет передавать вызов как сущность: сохранять, откладывать, логировать, отменять и т.п.

В мире Ruby — это часто просто класс с `.call`.

---

## 🔧 Как выглядит Command в Ruby?

```ruby
class DeactivateUser
  def self.call(user)
    new(user).call
  end

  def initialize(user)
    @user = user
  end

  def call
    @user.update!(active: false)
    Audit.log(@user, "deactivated")
  end
end
```

### Зачем?

* Читаемость: `DeactivateUser.call(user)` говорит сам за себя.
* Тестируемость: можно вызывать отдельно, без контроллера.
* Повторное использование: можно вызывать из джоба, rake, интерактора и т.д.

---

## 📦 Когда применять?

Command хорош, когда:

* Есть **одно действие** с побочками (отправка письма, запись в лог, создание записи)
* Нужно **разнести логику** по разным файлам (а не контроллер на 200 строк)
* Вы хотите сделать систему **более декларативной** — `ApproveInvoice.call(invoice)` вместо `invoice.approve!` с неочевидной внутренней логикой

---

## 💣 Когда это антипаттерн

Не всё, что можно запихнуть в `.call`, стоит туда пихать:

### 🚫 Если:

* Класс **ничего не делает** кроме одной строки (`UserMailer.welcome(user).deliver_later`) — возможно, это overkill.
* У вас уже есть **интеракторы или сервисы** — и Command просто дублирует слой.
* Вы создаёте `CreateUserCommand`, `DeleteUserCommand`, `UpdateUserCommand` — и всё это по одной строчке. Это уже **не архитектура, а Java**.

---

## 🧪 Тестируемость

Command отлично тестируется как unit:

```ruby
describe DeactivateUser do
  it "deactivates user and logs" do
    user = create(:user, active: true)
    expect { described_class.call(user) }.to change { user.reload.active }.to(false)
  end
end
```

Идеально для `spec/services/`.

---

## 🎤 На собеседовании

> — Вы используете Service Objects?

> — Да, и если операция атомарная — предпочитаю Command: один `.call`, один эффект.

---

## 🧾 Вывод

**Command — хороший способ дать имени действие.**
Если ваш код говорит сам за себя (`BanUser.call(user)`), значит, вы идёте правильным путём.

Только не превращайте проект в коллекцию классов `XxxCommand`. Ruby — про элегантность, а не про шаблоны ради шаблонов.
