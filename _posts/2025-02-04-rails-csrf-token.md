---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'CSRF в Rails: зачем этот authenticity_token вообще нужен'
date: '2024-09-18 12:00:00 +0300'
categories:
- security
- rails
tags: Ruby on Rails,безопасность,CSRF,веб-разработка
rate: 2
hero_image: "/images/posts/background_post-0101.webp"
---
Каждый Rails-разработчик сталкивался с загадочным `authenticity_token` в формах. Он появляется как по волшебству, ломает тесты, если его забыть, но мало кто понимает, зачем он на самом деле нужен. Разберёмся, как этот токен защищает ваше приложение от CSRF-атак, почему его нельзя игнорировать и как правильно с ним работать.

---

## 🔐 Что такое CSRF?

**CSRF (Cross-Site Request Forgery)** — это атака, когда злоумышленник заставляет браузер пользователя выполнять нежелательные действия в другом веб-приложении, где пользователь авторизован.

Пример сценария:
1. Вы залогинены в интернет-банке.
2. Переходите на вредоносный сайт, который отправляет запрос на `/transfer_money?amount=1000&to=attacker`.
3. Браузер автоматически добавляет ваши куки — и деньги уходят мошеннику.

---

## 🛡️ Как Rails защищается от CSRF?

Rails использует **authenticity_token** — уникальный токен, который:
1. Генерируется для каждой сессии.
2. Встраивается в формы и AJAX-запросы.
3. Проверяется сервером перед выполнением действий.

```html
<form action="/posts" method="post">
  <input type="hidden" name="authenticity_token" value="k3j5h...">
  <!-- остальные поля -->
</form>
```

Если токен не совпадает — Rails отклоняет запрос с ошибкой `ActionController::InvalidAuthenticityToken`.

---

## 🔧 Как это работает под капотом?

1. **Генерация токена**:
   ```ruby
   # В контроллере
   def form
     @token = form_authenticity_token
   end
   ```

2. **Проверка** (в `ActionController::RequestForgeryProtection`):
   ```ruby
   def verify_authenticity_token
     raise InvalidAuthenticityToken unless verified_request?
   end
   ```

3. **Механизм проверки**:
   - Для форм: сравнивает токен из параметров с токеном в сессии.
   - Для JSON API: проверяет заголовок `X-CSRF-Token`.

---

## 💥 Типичные проблемы и решения

### 1. "У меня API — зачем мне CSRF?"
Если ваш API **не использует куки для аутентификации** (например, только JWT), можно отключить защиту:
```ruby
class ApiController < ActionController::Base
  skip_forgery_protection
end
```

### 2. "Токен сломал мои тесты"
Используйте `post :create, params: { ... }, as: :json` или добавьте токен вручную:
```ruby
post :create, params: { authenticity_token: @controller.form_authenticity_token }
```

### 3. "Форма рендерится через Turbo Stream"
Turbo автоматически добавляет токен, но если вы рендерите частичные формы через `render partial: 'form'`, не забудьте:
```erb
<%= form_with(model: @post) do |form| %>
  <%= form.hidden_field :authenticity_token %>
<% end %>
```

---

## ⚠️ Опасные антипаттерны

### ❌ Глобальное отключение защиты
```ruby
# config/application.rb
config.action_controller.default_protect_from_forgery = false # НИКОГДА ТАК НЕ ДЕЛАЙТЕ
```

### ❌ Передача токена в URL
```ruby
link_to "Удалить", post_path(@post, authenticity_token: form_authenticity_token), method: :delete
```
Токен может попасть в логи или историю браузера.

### ❌ Использование одного токена для всех пользователей
```ruby
# Не делайте так!
def form_authenticity_token
  "static_token"
end
```

---

## 🛠️ Правильная работа с токенами

### Для AJAX-запросов:
```javascript
// Используйте мета-тег
const token = document.querySelector('meta[name="csrf-token"]').content;
fetch('/posts', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token
  }
});
```

### Для API с сессиями:
Добавьте в `ApplicationController`:
```ruby
protect_from_forgery with: :exception
after_action :set_csrf_cookie

def set_csrf_cookie
  cookies['CSRF-TOKEN'] = form_authenticity_token
end
```

---

## 🎯 Вывод

`authenticity_token` — это не "магия Rails", а критически важный механизм безопасности:
- **Защищает** от CSRF-атак без участия пользователя.
- **Работает** прозрачно в большинстве случаев.
- **Требует внимания** при работе с API и кастомными JavaScript-запросами.

Как и ремни безопасности в автомобиле — он может казаться неудобным, пока вы не столкнётесь с реальной угрозой. Не отключайте его без крайней необходимости и всегда проверяйте, что он на месте в ваших формах!
