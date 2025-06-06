---
layout: post
title:  "Почему нельзя просто взять current_user"
date:   2025-04-27 12:00:00 +0300
categories:
  - architecture
  - rails
toc: true
menubar_toc: true
hero_image: /images/architecture.jpeg
hero_darken: true
---

Когда приложение маленькое — `current_user` легко получить из контроллера.  
Но со временем всё начинает ломаться: фоновые задачи, воркеры, события, команды — и все кричат:  
> А кто пользователь-то?!

---

## 🧵 Контекст теряется

Вот пример:

```ruby
class CreateReportJob < ApplicationJob
  def perform(report_id)
    report = Report.find(report_id)
    ReportBuilder.new(report).call # А кто вызвал?!
  end
end
````

А теперь попробуй логировать или подписать результат. Без `current_user` — это невозможно.

---

## 🧳 Передавай явно

Вместо "магии из воздуха", передавай пользователя **явно**:

```ruby
GenerateReport.call(user: current_user, report: report)
```

А внутри:

```ruby
class GenerateReport
  def initialize(user:, report:)
    @user = user
    @report = report
  end
end
```

---

## 🔥 Что пойдёт не так

* В тестах `current_user` будет `nil`
* В консюмере Kafka нет `request`
* В Sidekiq нет контроллера
* В event-driven архитектуре — `current_user` не сериализуется

---

## 🛡️ Альтернатива: context

Некоторые фреймворки или обёртки позволяют прокидывать **context**:

```ruby
context = { current_user: user }
SomeService.call(context: context)
```

Но в Rails это не дефолт — лучше быть явным.

---

## ✅ Вывод

Меньше магии — больше читаемости.
Передавай пользователя (и вообще всё важное) **в явной форме**, особенно если работа уходит за рамки запроса.
