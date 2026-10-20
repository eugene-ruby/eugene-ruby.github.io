---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Devise против Authlogic: что выбрать и как не наломать'
date: '2024-09-18 10:00:00 +0300'
categories:
- gems
- rails
tags: Ruby on Rails,Authentication,Devise,Authlogic,PostgreSQL,безопасность
rate: 2
hero_image: "/images/posts/background_post-0048.webp"
---
Выбор системы аутентификации для Rails-приложения — как выбор между ножом и скальпелем: оба режут, но для разных задач. Devise и Authlogic — два самых популярных решения, но их философия и подход к безопасности кардинально отличаются. Разберёмся, когда какой инструмент использовать, как избежать типичных ошибок и не превратить авторизацию в головную боль.

---

## 🧠 Теория: два пути аутентификации

### Devise: "Всё включено"
**Плюсы:**
- Готовые контроллеры, роуты, формы
- Поддержка OAuth, подтверждение email, сброс пароля
- Активное сообщество и частые обновления

**Минусы:**
- Монолитная архитектура (тяжело кастомизировать)
- Магия под капотом (например, `warden`)
- Избыточность для простых проектов

### Authlogic: "Лего для взрослых"
**Плюсы:**
- Минимализм (только базовые абстракции)
- Полный контроль над логикой
- Простота интеграции с кастомными моделями

**Минусы:**
- Нужно писать больше кода вручную
- Меньше встроенных фич
- Требует понимания криптографии

---

## 🔧 Практика: установка и настройка

### Devise (5 минут до первого входа)
```ruby
# Gemfile
gem 'devise'

# Консоль
rails generate devise:install
rails generate devise User
rails db:migrate

# Добавляем в роуты
devise_for :users
```

Готово! Появились:
- `/users/sign_in`
- `/users/sign_up`
- Password recovery

### Authlogic (15 минут + кофе)
```ruby
# Gemfile
gem 'authlogic'

# Модель User
class User < ApplicationRecord
  acts_as_authentic do |c|
    c.crypto_provider = Authlogic::CryptoProviders::SCrypt
  end
end

# Сессия
class UserSession < Authlogic::Session::Base
end

# Контроллер
def create
  @user_session = UserSession.new(params[:user_session])
  if @user_session.save
    redirect_to root_url
  else
    render :new
  end
end
```

---

## 🛡 Безопасность: где подводные камни?

### Devise: "Чёрный ящик"
- **Проблема:** сложно модифицировать алгоритмы хеширования
- **Пример:** переход с bcrypt на Argon2 требует патчей
- **Фикс:** использовать `devise-security` для улучшенных правил паролей

### Authlogic: "Сам себе криптограф"
- **Проблема:** можно случайно отключить защиту
- **Пример:** 
  ```ruby
  acts_as_authentic do |c|
    c.validate_password_field = false # Ой!
  end
  ```
- **Фикс:** всегда включать базовые валидации:
  ```ruby
  c.validate_login_field = true
  c.validate_password_field = true
  ```

---

## 📈 Производительность: PostgreSQL-специфика

### Devise
- Генерирует тяжелые SQL-запросы для `trackable` (последний вход, IP)
- Решение: ограничить сбор метрик:
  ```ruby
  devise :database_authenticatable, 
         :registerable,
         :trackable # только если нужно!
  ```

### Authlogic
- Легковесные запросы, но нет кеширования сессий
- Решение: добавить `session_store :cache_store` в `config/application.rb`

---

## 💀 Антипаттерны

### Для Devise
1. **Переопределение контроллеров**  
   Вместо:
   ```ruby
   class RegistrationsController < Devise::RegistrationsController
     def create
       # 100 строк кастомной логики
     end
   end
   ```
   Лучше: использовать Service Objects.

2. **Игнорирование `lockable`**  
   Не включать защиту от брутфорса — преступление.

### Для Authlogic
1. **Самописные хеши**  
   ```ruby
   c.crypto_provider = MyHomebrewCrypto.new # NEVER DO THIS
   ```
2. **Хранение сессий в модели**  
   ```ruby
   user.user_session = UserSession.create # Антипаттерн!
   ```

---

## 🎯 Когда что выбирать?

| Критерий               | Devise | Authlogic |
|------------------------|--------|-----------|
| MVP за 1 день          | ✅      | ❌         |
| Микросервисная архитектура | ❌      | ✅         |
| Кастомные поля аутентификации | ❌      | ✅         |
| Поддержка OmniAuth     | ✅      | ❌         |
| Полный контроль над security | ❌      | ✅         |

**Вывод:**  
- Для стартапов и SaaS — **Devise**  
- Для высоконагруженных/кастомных систем — **Authlogic**  

---

## 🔮 Будущее: может, просто Sorcery?

Если оба варианта кажутся крайностями, присмотритесь к [Sorcery](https://github.com/Sorcery/sorcery) — это золотая середина с модульной архитектурой. Но это уже тема для отдельной статьи.

```ruby
# Gemfile
gem 'sorcery'
```

---

## 🧾 Итог

1. **Не усложняйте** — если хватает Devise, не изобретайте велосипед.  
2. **Тестируйте безопасность** — оба решения требуют проверки на уязвимости.  
3. **Документируйте** — особенно кастомные изменения в Authlogic.  

> "Лучшая система аутентификации — та, которую вы полностью понимаете и можете объяснить коллеге в 3 часа ночи".
