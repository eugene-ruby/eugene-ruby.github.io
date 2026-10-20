---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Когда enum уже не справляется: State Machine как спасение'
date: '2024-09-18 12:00:00 +0300'
categories:
- pattern
- rails
tags: Ruby,enum,методы,условия,проверки,состояния
rate: 3
hero_image: "/images/posts/background_post-0082.webp"
---
Enum в Rails — это удобство, которое легко перерастает в катастрофу.
Вы начали с невинного `enum status: [:draft, :published, :archived]`.
А теперь в коде: `if post.draft? && user.admin? && !weekend? && moon_in_taurus?`.
Поздравляю — у вас не enum, а полноценная система переходов, запрятанная в условиях.

В этой статье разберёмся, **что такое State Machine**, когда она приходит на помощь, и почему она может быть вашим спасением от бесконечных `if`. Покажем, как внедрить её в Rails-проект красиво, без магии и боли.

---

## 🧙‍♂️ Теория: что такое State Machine?

**State Machine (стейт-машина, автомат состояний)** — это модель, где:  
- Объект может находиться только в **одном из конечного числа состояний**  
- Переходы между состояниями **строго определены**  
- Можно навесить **колбэки, валидации и guard-условия**  

Это как светофор: нельзя перейти с "зелёного" сразу на "красный", минуя "жёлтый".

---

## 💣 Когда enum становится врагом

```ruby
class Article < ApplicationRecord
  enum status: [:draft, :published, :archived]

  def publish!
    return if archived? || (draft? && !user.has_permission?)
    update!(status: :published)
    NotifySubscribers.call(self)
    AuditLog.record!(self)
  end
end
```

**Проблемы:**  
1. Логика переходов **размазана** по методам  
2. Нет единого места, где видны **все возможные переходы**  
3. Добавление нового статуса = **ревью всего кода**  

---

## 🚀 Переходим на стейт-машину

### Вариант 1: Пишем свою (для мазохистов)

```ruby
class Article
  STATES = %i[draft published archived].freeze

  def initialize(state)
    @state = state
  end

  def publish!
    raise "Нельзя опубликовать архив" if @state == :archived
    @state = :published
  end
end
```

**Минусы:**  
- Велосипеды квадратные  
- Нет удобных колбэков  

---

### Вариант 2: Используем `aasm` (рекомендуется)

```ruby
class Article < ApplicationRecord
  include AASM

  aasm column: :status do
    state :draft, initial: true
    state :published
    state :archived

    event :publish do
      transitions from: :draft, to: :published, guard: :valid_author?
      after { NotifySubscribers.call(self) }
    end

    event :archive do
      transitions from: [:draft, :published], to: :archived
    end
  end

  def valid_author?
    user.has_permission? && !user.banned?
  end
end
```

**Фишки:**  
✅ Все переходы **явно объявлены** в одном месте  
✅ Поддержка **before/after хуков**  
✅ **Guard-условия** для сложных сценариев  

---

## 🔥 Горячие грабли

### 1. Не учитывайте все переходы

```ruby
event :archive do
  transitions from: :published, to: :archived # забыли :draft
end
```

**Решение:** тестируйте coverage-тестами:

```ruby
Article.state_machine.states.each do |state|
  it "позволяет архивировать из #{state}" do
    # ...
  end
end
```

---

### 2. Слишком много колбэков

```ruby
after_publish :notify, :audit, :update_elastic, :invalidate_cache
```

**Итог:** при вызове `publish!` получаете **неочевидные сайд-эффекты**.  

**Решение:** выносите в сервисы:

```ruby
PublishArticle.call(article) # внутри: article.publish! + побочки
```

---

### 3. Игнорирование конкурентности

```ruby
article.publish! # User 1
article.archive! # User 2 (параллельно)
```

**Фикс:**  
- Оптимистичные блокировки (`lock_version`)  
- PostgreSQL advisory locks  

---

## 📊 Сравнение гемов

| Гем          | Плюсы                          | Минусы                   |
|--------------|-------------------------------|--------------------------|
| `aasm`       | Гибкость, активное развитие   | Магия в колбэках         |
| `statesman`  | Чистые переходы, история      | Больше кода              |
| `workflow`   | Простота                      | Устаревший               |

**Мой выбор — `aasm`** для большинства случаев.

---

## 🧪 Тестирование

```ruby
RSpec.describe Article, type: :model do
  describe "state transitions" do
    context "from draft" do
      let(:article) { create(:article, status: :draft) }

      it "allows publishing" do
        expect { article.publish! }
          .to change(article, :status).to("published")
      end

      it "forbids archiving for guests" do
        article.user = build(:user, role: :guest)
        expect { article.archive! }.to raise_error(AASM::InvalidTransition)
      end
    end
  end
end
```

---

## 🎤 Что сказать на собеседовании

> — Почему не enum?  

— Когда появились сложные правила переходов, мы перешли на стейт-машину. Это сделало код:  
- **Понятнее** (все переходы в одном месте)  
- **Надёжнее** (валидации перед переходом)  
- **Легче для расширения**  

---

## 🧾 Вывод

**State Machine — это Гэндальф вашего кода.**  
Он появляется, когда enum уже не справляется с орками бизнес-логики.  

**Внедряйте, если:**  
- Есть сложные правила переходов  
- Нужны гарантированные колбэки  
- Хочется явно видеть жизненный цикл объекта  

**Но не превращайте в "магию":**  
- Избегайте скрытых сайд-эффектов  
- Тестируйте все переходы  
- Следите за блокировками  

Теперь ваш код сможет спокойно пройти через Морию бизнес-требований. 🧙‍♂️
