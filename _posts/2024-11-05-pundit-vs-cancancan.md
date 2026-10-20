---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Pundit и CanCanCan: борьба за авторизацию без боли'
date: '2024-09-18 12:00:00 +0300'
categories:
- gems
- rails
tags: Ruby on Rails,Авторизация,Безопасность,PostgreSQL,Архитектура
rate: 2
hero_image: "/images/posts/background_post-0078.webp"
---
Авторизация в Rails-приложениях — это как охрана в ночном клубе: если пропустит не того, будет скандал, а если слишком строгая — никто не войдёт. В этой статье разберём два популярных инструмента — **Pundit** и **CanCanCan** — и выясним, когда какой выбрать, чтобы не превратить код в крепость с колючей проволокой.

---

## 🧠 Теория: Pundit vs CanCanCan — в чём разница?

Оба гема решают одну задачу: **"Может ли пользователь сделать X?"**, но подходят к ней с разных сторон.

| Особенность          | CanCanCan                          | Pundit                             |
|----------------------|------------------------------------|------------------------------------|
| **Подход**           | Централизованный (Ability-класс)   | Децентрализованный (Policy-классы) |
| **Где живут правила**| Один файл `ability.rb`             | Множество `*_policy.rb`            |
| **Синтаксис**        | `can :read, Project`               | `policy(@project).read?`           |
| **Гибкость**         | Умеренная                          | Высокая                            |

**CanCanCan** напоминает швейцарский нож — все правила в одном месте. **Pundit** — это модульный инструмент, где каждая сущность получает свою "политику".

---

## 🔧 CanCanCan: пример настройки

Устанавливаем гем:

```ruby
# Gemfile
gem 'cancancan'
```

Создаём Ability-класс:

```ruby
# app/models/ability.rb
class Ability
  include CanCan::Ability

  def initialize(user)
    user ||= User.new # гость

    if user.admin?
      can :manage, :all
    else
      can :read, Project, public: true
      can :manage, Project, user_id: user.id
    end
  end
end
```

Использование в контроллере:

```ruby
class ProjectsController < ApplicationController
  load_and_authorize_resource # магия!

  def show
    # @project уже авторизован
  end
end
```

---

## 🔧 Pundit: пример настройки

Устанавливаем гем:

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
    project.public? || user.admin? || project.user == user
  end
end
```

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

---

## 💡 Когда что выбрать?

### CanCanCan подходит, если:
- Правила простые и логически связаны
- Хочется минимального кода в контроллерах
- Нужна "из коробки" интеграция с Rails Admin

### Pundit выручает, когда:
- Правила сложные и зависят от контекста
- Требуется тонкий контроль над сообщениями об ошибках
- Политики должны быть тестируемы изолированно

---

## 🧪 Тестирование: CanCanCan vs Pundit

**CanCanCan (RSpec):**

```ruby
describe Ability do
  it "разрешает админу всё" do
    admin = build(:user, admin: true)
    ability = Ability.new(admin)
    expect(ability).to be_able_to(:manage, :all)
  end
end
```

**Pundit (RSpec):**

```ruby
describe ProjectPolicy do
  let(:user) { build(:user) }
  let(:project) { build(:project, user: user) }

  it "разрешает чтение владельцу" do
    expect(ProjectPolicy.new(user, project).to permit_action(:read?)
  end
end
```

Pundit здесь выигрывает за счёт явной изоляции тестов.

---

## 🔥 Антипаттерны

### Для CanCanCan:
1. **Ability-монстр** (500+ строк в одном файле)
2. **Магические условия** (`can :update, Project, { tasks: { assignee_id: user.id } }`)
3. **Глобальные правила** (когда `cannot :manage, :all` перекрывает всё)

### Для Pundit:
1. **Policy-спагетти** (дублирование кода между политиками)
2. **Контроллерный хаос** (ручные `authorize` в каждом методе)
3. **Наследование-костыль** (когда `AdminPolicy < UserPolicy` запутывает всё)

---

## 🎤 Что сказать на собеседовании

> — Почему вы выбрали Pundit, а не CanCanCan?

— В нашем проекте политики доступа были тесно связаны с бизнес-контекстом (например, доступ к черновикам статей зависел от 5+ факторов). Pundit позволил разнести логику по доменным объектам и тестировать её изолированно.

---

## 🧾 Вывод

**CanCanCan** — это "быстро и просто" для стандартных сценариев. **Pundit** — "гибко и явно" для сложных систем. 

Выбирайте первый, если правила авторизации — это просто проверка ролей. Второй — когда "можно ли?" зависит от состояния объекта, времени суток и фазы луны. Главное — не превращайте авторизацию в лабиринт, из которого даже вы не сможете выбраться через полгода.
