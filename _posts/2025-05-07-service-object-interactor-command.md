---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Service Object, Interactor и Command-подход: кто во что обернут'
short_description: 'Сравниваем Service Object, gem interactor и Command-подход в Rails:
  как устроены вызовы и обработка ошибок, чем отличаются ограничения и когда выбирать
  каждый вариант.'
date: '2025-05-07 11:00:00 +0300'
categories:
- architecture
- development
tags:
- Business Logic
- Command
- Error Handling
- Interactor Pattern
- Service Layer
- Service Object
rate: 4
hero_image: "/images/posts/background_post-0065.webp"
---
Когда контроллер обрастает шагами регистрации пользователя, часть логики можно вынести в отдельный объект. Но что выбрать: простой Service Object, gem `interactor` или собственный Command-подход?

## 🧱 Service Object

Обычно это класс с методом `call`, который выполняет одну операцию. Никакой специальной поддержки со стороны Rails ему не нужно:

```ruby
class RegisterUser
  def initialize(params)
    @params = params
  end

  def call
    User.create!(@params)
  end
end
```

Вызов: `RegisterUser.new(params).call`. При ошибке валидации `create!` выбросит исключение; вызывающий код должен решить, как его обработать. Если `params` пришли из контроллера, передавать их в модель нужно после разрешения нужных полей через strong parameters.

---

## 🧙‍♂️ Interactor

Если удобны общий `context`, `fail!` и объединение операций в цепочку, можно использовать gem [`interactor`](https://github.com/collectiveidea/interactor).

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

Вызов: `RegisterUser.call(params: ...)`. Если запись не создалась из-за ошибки валидации, результат будет неуспешным; вызывающий код может проверить `success?` и прочитать `error` из контекста. В отличие от примера с `create!`, здесь ошибка валидации не передаётся вызывающему коду как исключение. Для цепочки нескольких интеракторов нужен отдельный организатор с `include Interactor::Organizer` и перечислением шагов через `organize`.

---

## 🧾 Command-подход

Command тоже оформляет операцию отдельным объектом. В этом примере он принимает явный аргумент и проверяет входное условие перед созданием записи:

```ruby
class RegisterUserCommand
  def initialize(email:)
    @email = email
  end

  def call
    raise ArgumentError, "email is required" if @email.nil? || @email.empty?

    User.create!(email: @email)
  end
end
```

Вызов: `RegisterUserCommand.new(email: "user@example.com").call`. Проверка наличия строки не заменяет валидации модели. `Command` и `BaseCommand` не входят в Rails: общую обработку ошибок, события, телеметрию или аудит команда получит только в том случае, если вы сами добавите их в свою реализацию.

---

## 🚦 Когда использовать

| Сценарий | Подход |
| --- | --- |
| Нужно вынести отдельную операцию без дополнительной инфраструктуры | Service Object |
| Удобны общий контекст, `fail!` и цепочки операций | Interactor |
| Нужен собственный единый контракт вызова и обработки ошибок для группы операций | Command-подход |

---

## 💬 Вывод

Для простой операции часто достаточно обычного класса с `call`. `interactor` полезен, если его модель контекста и цепочек подходит задаче; собственный Command-подход — если проекту действительно нужны общие правила для таких объектов. Обёртка не обязательна для каждого действия модели: выносите логику из контроллера там, где это помогает разделить ответственность и упростить код.