---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'ActiveRecord и PostgreSQL JSONB: когда обычных таблиц уже недостаточно'
date: '2024-09-18 12:00:00 +0300'
categories:
- postgres
- rails
tags: Ruby,PostgreSQL,JSONB,Rails,базы данных,миграции
rate: 3
hero_image: "/images/posts/background_post-0065.webp"
---
Вы когда-нибудь чувствовали, что реляционные таблицы — это как пытаться впихнуть квадратный колышек в круглое отверстие? Когда очередной `users` с 50 колонками превращается в ад миграций, а `serialize :preferences, JSON` просто смеётся вам в лицо своей неэффективностью — пора знакомиться с **PostgreSQL JSONB**.


---
В этой статье разберём, как грамотно использовать JSONB в Rails-приложениях, чтобы сохранить и производительность, и рассудок.

## 🧠 Теория: JSONB vs JSON vs Hstore

PostgreSQL предлагает три способа хранить "нереляционные" данные:

| Тип       | Индексирование | Поддержка вложенности | Изменяемость |
|-----------|----------------|-----------------------|--------------|
| JSON      | Нет            | Да                    | Да           |
| JSONB     | Да             | Да                    | Да           |
| Hstore   | Да             | Нет                   | Да           |

**JSONB** — это "бинарный JSON" с:
- Поддержкой индексов (GIN/GIST)
- Быстрым поиском по вложенным полям
- Автоматической валидацией структуры

---

## 🔧 Практика: добавляем JSONB в Rails

Допустим, у нас есть модель `User` с динамическими настройками:

```ruby
# Миграция
class AddPreferencesToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :preferences, :jsonb, default: {}
    add_index :users, :preferences, using: :gin  # Для быстрого поиска
  end
end
```

Теперь можно работать как с обычным хэшем:

```ruby
user = User.create!(
  email: "dev@example.com",
  preferences: {
    theme: "dark",
    notifications: {
      email: true,
      push: false
    }
  }
)

user.preferences.dig(:notifications, :email) # => true
```

---

## 💡 Когда использовать JSONB?

1. **Динамические атрибуты** (настройки, метаданные)
2. **Лёгкие NoSQL-структуры** (например, кэшированные данные API)
3. **Быстрое прототипирование** (когда схема ещё не устаканилась)

Но помните: если данные **критичны для бизнеса** и требуют сложных JOIN — возможно, это повод для отдельной таблицы.

---

## 🚀 Продвинутые фишки

### 1. Поиск по вложенным полям

```ruby
# Найти всех с тёмной темой
User.where("preferences->>'theme' = ?", "dark")

# Те, кто отключил email-уведомления
User.where("preferences->'notifications'->>'email' = ?", "false")
```

### 2. Частичное обновление

```ruby
user.update!(
  "preferences.notifications.push": true
)
```

### 3. Дефолтные значения через модель

```ruby
class User < ApplicationRecord
  attribute :preferences, :jsonb, default: -> {
    {
      theme: "light",
      notifications: {
        email: true
      }
    }
  }
end
```

---

## 💣 Антипаттерны

### 1. JSONB как мусорка

```ruby
# Плохо: всё подряд
{
  last_login_ip: "...",
  cached_api_response: "...",
  temp_flags: [...]
}

# Лучше: только логически связанные данные
{
  ui_settings: { ... },
  notification_rules: [ ... ]
}
```

### 2. Отсутствие схемы

Если у вас есть чёткие требования к структуре — добавьте валидацию:

```ruby
validate :preferences_schema

def preferences_schema
  errors.add(:preferences, "must include theme") unless preferences.key?(:theme)
end
```

### 3. Игнорирование индексов

Без индексов поиск по JSONB превращается в `O(n)`:

```ruby
# В миграции
add_index :users, "(preferences->>'theme')", name: "index_users_on_preferences_theme"
```

---

## 🧪 Тестирование

```ruby
describe User do
  describe "preferences" do
    let(:user) { build(:user, preferences: { theme: "dark" }) }

    it "validates presence of theme" do
      user.preferences.delete(:theme)
      expect(user).not_to be_valid
    end

    it "allows nested updates" do
      user.update!("preferences.notifications.email" => false)
      expect(user.preferences.dig(:notifications, :email)).to eq false
    end
  end
end
```

---

## 🎤 Что сказать на собеседовании

> — Почему вы выбрали JSONB вместо отдельной таблицы для настроек?

— Мы храним только слабоструктурированные данные с низкой волатильностью. JSONB даёт нам гибкость без потерь производительности благодаря индексам GIN, при этом сохраняя возможность сложных запросов через PostgreSQL-операторы.

---

## � Вывод

JSONB в PostgreSQL — это как швейцарский нож: 
- **Режет** проблемы с динамическими атрибутами
- **Открывает** бутылки с производительностью
- **И даже** может пригодиться в неожиданных ситуациях

Главное — не пытаться забивать им гвозди (читай: использовать для всего подряд). Когда схема стабилизируется — возможно, пришло время для "настоящих" таблиц.

P.S. Если ваш JSONB-поле стало глубже, чем Марианская впадина — это верный знак, что пора рефакторить.
