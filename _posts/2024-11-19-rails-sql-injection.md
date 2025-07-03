---
layout: post
subtitle: <div id="terminal"></div>
title: "SQL-инъекции в Rails: не доверяй params как себе"
date: 2024-09-18 12:00:00 +0300
rate: 2
tags: Ruby on Rails, PostgreSQL, Security, SQL Injection, Web Development
version: 3.2.2
categories:
  - security
  - rails
hero_image: /images/posts/50.jpg
hero_darken: true
toc: true
menubar_toc: true
---

SQL-инъекции — одна из самых опасных уязвимостей веб-приложений, способная превратить безобидный параметр запроса в полноценную атаку на базу данных. В Rails эта проблема часто маскируется за удобством Active Record, создавая ложное ощущение безопасности. Разберёмся, где скрываются риски и как их устранить.

---

## 🔍 Как работает SQL-инъекция в Rails?

Представьте: у вас есть поиск пользователей по имени:

```ruby
User.where("name = '#{params[:name]}'")
```

Кажется безобидным? А теперь передадим в `name` значение `' OR '1'='1`:

```sql
SELECT * FROM users WHERE name = '' OR '1'='1'
```

**Бабах!** Мы получили всех пользователей системы. Это классическая SQL-инъекция.

### Почему Rails не защищает автоматически?

Active Record **экранирует параметры только при использовании плейсхолдеров**. Но разработчики часто:

1. Пишут "сырые" SQL-строки
2. Динамически собирают запросы из параметров
3. Используют `sanitize_sql` неправильно

---

## 💀 Антипаттерны: как ломают ваши приложения

### 1. Конкатенация строк в запросах

```ruby
# Плохо (уязвимо)
User.where("email LIKE '%#{params[:search]}%'")

# Хорошо (безопасно)
User.where("email LIKE ?", "%#{params[:search]}%")
```

### 2. Динамический `order` из параметров

```ruby
# Опасный код в контроллере
@users = User.order(params[:sort] + " " + params[:direction])

# Эксплойт:
# ?sort=id;DROP TABLE users;&direction=--
```

### 3. Прямое использование `params` в `execute`

```ruby
# Катастрофа!
ActiveRecord::Base.connection.execute("SELECT * FROM users WHERE id = #{params[:id]}")
```

---

## 🛡️ Защитные механизмы Rails

### 1. Плейсхолдеры

```ruby
# Безопасные варианты:
User.where("name = ?", params[:name])
User.where(name: params[:name])
User.where("name = :name", name: params[:name])
```

### 2. `sanitize_sql` для сложных случаев

```ruby
safe_condition = ActiveRecord::Base.sanitize_sql(["role = ?", params[:role]])
User.where(safe_condition)
```

### 3. Whitelisting для сортировки

```ruby
# В контроллере
def sort_column
  %w[name email created_at].include?(params[:sort]) ? params[:sort] : "name"
end

def sort_direction
  %w[asc desc].include?(params[:direction]) ? params[:direction] : "asc"
end

# В запросе
@users = User.order("#{sort_column} #{sort_direction}")
```

---

## � Реальный кейс: как мы ловили инъекцию в продакшене

**Симптомы:** Необъяснимые 500-е ошибки, странные логи в PostgreSQL.

**Расследование:** В логах обнаружились запросы вида:

```sql
SELECT * FROM transactions WHERE amount > 0 AND (SELECT 1 FROM pg_sleep(10)) --
```

**Виновник:** 

```ruby
Transaction.where("amount > #{params[:min_amount]") if params[:min_amount].present?
```

**Решение:** 

1. Срочный хотфикс с `to_f`:
   ```ruby
   Transaction.where("amount > ?", params[:min_amount].to_f)
   ```

2. Добавили RSpec-тест:
   ```ruby
   it "ignores SQL injection in min_amount" do
     get :index, params: { min_amount: "0; DROP TABLE transactions;" }
     expect(response).to be_successful
   end
   ```

---

## 🧪 Тестирование на уязвимости

### 1. Руби-гем `brakeman`

Добавьте в `Gemfile`:

```ruby
group :development do
  gem 'brakeman', require: false
end
```

Запуск:
```bash
brakeman -q -w2
```

### 2. RSpec-тесты с вредоносными параметрами

```ruby
describe "SQL injection protection" do
  it "sanitizes user input in where clauses" do
    expect {
      User.where("name = '#{'\' OR \'1\'=\'1'}'").to_a
    }.to raise_error(ActiveRecord::StatementInvalid)
  end
end
```

---

## 🚀 Продвинутая защита: Arel и хранимые процедуры

Для сложных запросов используйте **Arel** — SQL-билдер Rails:

```ruby
users = User.arel_table
query = users[:name].eq(params[:name]).and(users[:active].eq(true))
User.where(query)
```

Для критических операций — **хранимые процедуры PostgreSQL**:

```ruby
ActiveRecord::Base.connection.execute(
  "SELECT secure_user_search(#{ActiveRecord::Base.sanitize_sql(params[:query])})"
)
```

---

## 📝 Вывод: правила параноика

1. **Никогда** не интерполируйте `params` напрямую в SQL
2. Для динамического SQL используйте **только**:
   - Плейсхолдеры (`?`)
   - Именованные параметры (`:name`)
   - `sanitize_sql`
3. Тестируйте все endpoints с **специально сформированными параметрами**
4. Регулярно запускайте **brakeman**
5. Для админок и API используйте **strong parameters** + whitelisting

> "Доверяй, но проверяй" — хороший принцип для жизни, но ужасный для работы с `params` в Rails. Здесь работает только **"Не доверяй вообще"**.

```ruby
# Ваш код после прочтения статьи:
User.where("trust_level > ?", params[:trust].to_i)
# Спасибо, что не доверяете params как себе 😉
```
