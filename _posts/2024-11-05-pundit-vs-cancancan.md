---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Pundit и CanCanCan: борьба за авторизацию без боли'
short_description: 'Сравниваем Pundit и CanCanCan для авторизации в Rails: как устроены
  правила доступа, как проверить их в контроллере и тестах и что учесть при выборе.'
date: '2024-09-18 12:00:00 +0300'
categories:
- development
- security
tags:
- Authorization
- Testing
rate: 2
hero_image: "/images/posts/background_post-0078.webp"
---
Авторизация в Rails-приложениях — это как охрана в ночном клубе: если пропустит не того, будет скандал, а если окажется слишком строгой — никто не войдёт. Разберём два инструмента — **Pundit** и **CanCanCan** — и посмотрим, как устроены их правила доступа и когда какой подход удобнее.

---

## 🧠 Теория: Pundit vs CanCanCan — в чём разница?

Оба гема помогают ответить на вопрос **«Может ли пользователь сделать X?»**, но организуют правила по-разному.

| Особенность | CanCanCan | Pundit |
|---|---|---|
| **Подход** | Правила задаются через `Ability` | Правила задаются через классы политик |
| **Где живут правила** | Обычно в `ability.rb`; при необходимости их можно разнести | В отдельных `*_policy.rb` |
| **Проверка доступа** | `can?(:read, project)` | `policy(project).read?` |

**CanCanCan** позволяет описывать разрешённые действия через `Ability` и использовать эти правила при загрузке ресурсов. **Pundit** связывает проверки с политиками для конкретных ресурсов. Это различие в организации кода, а не гарантия, что один инструмент справится со сложными правилами, а другой — нет.

---

## 🔧 CanCanCan: пример настройки

Добавляем гем:

```ruby
# Gemfile
gem 'cancancan'
```

Создаём `Ability`:

```ruby
# app/models/ability.rb
class Ability
  include CanCan::Ability

  def initialize(user)
    if user&.admin?
      can :manage, :all
    else
      can :read, Project, public: true
      can :manage, Project, user_id: user.id if user&.persisted?
    end
  end
end
```

Проверка `persisted?` здесь существенна: если подставить гостю `User.new`, его `id` будет `nil`, а правило `user_id: nil` может разрешить управление проектом без владельца. В этом примере гость может читать публичные проекты, но не управлять ими.

Использование в контроллере:

```ruby
class ProjectsController < ApplicationController
  load_and_authorize_resource

  def show
    # @project загружен, доступ к нему проверен
  end
end
```

Для `show` CanCanCan проверяет право на чтение. Если доступа нет, он вызывает ошибку авторизации; обработку этой ошибки нужно настроить в приложении.

---

## 🔧 Pundit: пример настройки

Добавляем гем:

```ruby
# Gemfile
gem 'pundit'
```

Политика для проекта:

```ruby
# app/policies/project_policy.rb
class ProjectPolicy
  attr_reader :user, :project

  def initialize(user, project)
    @user = user
    @project = project
  end

  def read?
    return true if project.public?
    return false unless user

    user.admin? || (user.persisted? && project.user_id == user.id)
  end
end
```

Здесь тоже важно не сравнивать владельца с гостем по пустому `id`: иначе проект без владельца можно ошибочно принять за гостевой.

Контроллер:

```ruby
class ProjectsController < ApplicationController
  include Pundit::Authorization

  def show
    @project = Project.find(params[:id])
    authorize @project, :read?
  end
end
```

Pundit не загружает проект вместо контроллера: мы находим его и явно вызываем проверку `read?`. Если политика отказывает в доступе, Pundit вызывает ошибку авторизации, которую также нужно обработать в приложении.

---

## 💡 Когда что выбрать?

### CanCanCan подходит, если:
- Правила удобно выражать через действия и условия для моделей
- Полезна загрузка ресурса с проверкой доступа через `load_and_authorize_resource`
- Команде подходит организация разрешений через `Ability`, который при необходимости можно разделить на части

### Pundit выручает, когда:
- Удобнее держать проверки рядом с политикой конкретного ресурса
- Нужны явные вызовы `authorize` в действиях контроллера
- Правила проще читать и проверять как методы отдельных классов

Оба инструмента позволяют тестировать правила отдельно. Выбор зависит не только от сложности условий, но и от того, как команде удобнее организовывать проверки.

---

## 🧪 Тестирование: CanCanCan vs Pundit

**CanCanCan (RSpec):**

```ruby
describe Ability do
  it "разрешает админу всё" do
    admin = build(:user, admin: true)
    ability = Ability.new(admin)

    expect(ability.can?(:manage, :all)).to be(true)
  end

  it "не разрешает гостю управлять проектом без владельца" do
    project = Project.new(user_id: nil)

    expect(Ability.new(nil).can?(:manage, project)).to be(false)
  end
end
```

**Pundit (RSpec):**

```ruby
describe ProjectPolicy do
  let(:user) { create(:user) }
  let(:project) { build(:project, user: user) }

  it "разрешает чтение владельцу" do
    expect(ProjectPolicy.new(user, project).read?).to be(true)
  end
end
```

В обоих случаях правила можно проверить без запроса к контроллеру. Для теста Pundit пользователь сохранён: политика сравнивает `project.user_id` с его `id`.

---

## 🔥 Антипаттерны

### Для CanCanCan:
1. **Ability-монстр** — в одном классе становится трудно находить правила и понимать их взаимодействие.
2. **Сложные условия без проверки** — например, для `can :update, Project, tasks: { assignee_id: user.id }` важно проверить и работу `can?`, и выборку через `accessible_by`, если она используется.
3. **Неожиданный порядок правил** — позднее `cannot :manage, :all` может отменить заданные ранее разрешения.

### Для Pundit:
1. **Policy-спагетти** — одинаковые проверки скопированы в несколько политик и со временем расходятся.
2. **Пропущенный `authorize`** — действие контроллера загружает объект, но не проверяет доступ к нему.
3. **Запутанная иерархия политик** — наследование скрывает, откуда взялось разрешение; само по себе наследование не ошибка.

---

## 🎤 Что сказать на собеседовании

> — Почему вы выбрали Pundit, а не CanCanCan?

— В нашем проекте правила доступа зависели от состояния конкретных объектов. Нам было удобнее разнести проверки по политикам, явно вызывать их в контроллерах и тестировать отдельно.

---

## 🧾 Вывод

**CanCanCan** удобен, когда правила естественно описываются действиями и условиями в `Ability`, а загрузку ресурса хочется объединить с проверкой доступа. **Pundit** подойдёт, если команде ближе отдельные политики и явные вызовы `authorize`.

Оба варианта требуют внимания к гостевому доступу, объектам без владельца и действиям, в которых проверку легко забыть. Выбирайте тот способ организации правил, который вашей команде проще читать и поддерживать.