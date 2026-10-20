---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Enum в ActiveRecord: как сделать красиво, а не через боль'
date: '2024-09-18 12:00:00 +0300'
categories:
- pattern
- rails
tags: Ruby,Rails,Enum,PostgreSQL,ActiveRecord,Бизнес-логика
rate: 3
hero_image: "/images/posts/background_post-0006.webp"
---
Enum в Rails — это как швейцарский нож: кажется простым, пока не попробуешь открыть им консервную банку. В статье разберём, как избежать типичных ошибок с enum, сделать код читаемым и поддерживаемым, а заодно научимся дружить их с PostgreSQL и бизнес-логикой.

---

Когда-то я думал, что `enum status: %i[draft published archived]` — это вершина элегантности.  
Пока не обнаружил в коде `user.update(status: :published)` в 15 разных местах, `scope :visible, -> { where(status: [:published, :archived]) }` и `if user.draft? && project.published?`.

Пришло время разобраться, **как делать enum правильно**.

## 🧠 Теория: зачем нужны enum?

**Enum (перечисление)** — это:
- Способ хранить статусы/типы в БД как **числа** (меньше места, быстрее поиск)
- **Методы-предикаты** (`user.published?`)
- **Автоматические скоупы** (`User.published`)
- Защита от **невалидных значений**

Но под капотом — грабли, на которые наступает каждый второй Rails-разработчик.

---

## 🔧 Базовый пример (и где подвох)

```ruby
class Article < ApplicationRecord
  enum status: {
    draft: 0,
    published: 1,
    archived: 2
  }
end
```

**Что получаем "из коробки":**
```ruby
article.published!   # Обновление + сохранение
article.published?   # Предикат
Article.published    # Скоуп
article.status       # => "published" (но в БД — 1)
```

---

## 💡 Лучшие практики

### 1. Явно указывайте значения

```ruby
enum status: {
  draft: "draft",
  published: "published",
  archived: "archived"
}, _prefix: true
```

**Плюсы:**
- Не ломается при добавлении новых статусов
- Читаемые значения в БД (удобно для аналитики)
- `_prefix: true` избегает конфликтов методов (теперь методы будут `article.status_published?`)

### 2. Используйте pg-enum для PostgreSQL

```ruby
# Миграция:
def up
  execute <<-SQL
    CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');
    ALTER TABLE articles ADD COLUMN status article_status;
  SQL
end

# Модель:
enum status: {
  draft: "draft",
  published: "published",
  archived: "archived"
}, _prefix: true
```

**Плюсы:**
- Типизация на уровне БД
- Невозможно записать несуществующее значение
- Экономия места (хранится как int, но отображается как текст)

---

## 🧪 Тестирование enum

**Плохо:**
```ruby
it "has statuses" do
  expect(Article.statuses).to eq({ "draft" => 0, ... })
end
```

**Хорошо:**
```ruby
describe "status" do
  it "defines correct values" do
    expect(described_class.statuses.keys).to match_array(%w[draft published archived])
  end

  context "when draft" do
    let(:article) { build(:article, status: :draft) }

    it { expect(article).to be_status_draft }
    it { expect(article).not_to be_status_published }
  end
end
```

---

## 🔥 Антипаттерны

### 1. Enum как замена State Machine
```ruby
enum status: {
  created: 0,
  approved: 1,
  rejected: 2,
  paid: 3,
  refunded: 4
}

# Потом в коде:
if user.created? && can_approve?(user)
  user.approved!
  send_notification
elsif user.approved? && can_pay?(user)
  user.paid!
  # ...
end
```

**Проблема**: бизнес-логика переходов размазана по коду.  
**Решение**: использовать специализированные гемы (AASM, Statesman).

### 2. Магические числа в коде
```ruby
scope :visible, -> { where(status: [1, 2]) } # 1 и 2 — это published и archived?
```

**Исправляем:**
```ruby
scope :visible, -> { where(status: [:published, :archived]) }
```

### 3. Слишком много значений
```ruby
enum priority: {
  lowest: 0, low: 1, medium: 2, high: 3, 
  urgent: 4, critical: 5, asap: 6, now: 7
}
```

**Проблема**: сложно поддерживать, легко ошибиться.  
**Решение**: сократить до 3-5 ключевых вариантов.

---

## 🎤 Что сказать на собеседовании

> — Как вы работаете с enum в Rails?

— Используем явное указание значений, pg-enum для PostgreSQL, избегаем бизнес-логики в enum. Для сложных workflow — State Machine.

---

## 🧾 Вывод

**Enum — это не просто синтаксический сахар, а инструмент проектирования.**  
Правильно применённый, он:
- Делает код **читаемым** (`article.published?` вместо `article.status == 1`)
- Защищает от **невалидных данных**
- Позволяет **эффективно хранить** состояния

Но если enum обрастает логикой переходов — это повод задуматься о State Machine.  

Правило: *"Enum — это про 'что', State Machine — про 'как'"*. И с этим не поспоришь.
