---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'XSS-атаки и erb: как Rails спасает, а когда — нет'
date: '2024-09-18 12:00:00 +0300'
categories:
- security
- rails
tags: Ruby on Rails, Безопасность, XSS, ERB, PostgreSQL, Веб-разработка
rate: 2
hero_image: "/images/posts/background_post-0065.webp"
---
XSS (Cross-Site Scripting) — одна из самых распространённых уязвимостей веб-приложений, позволяющая злоумышленникам внедрять вредоносный код в страницы. Rails предоставляет встроенные механизмы защиты, но даже они иногда дают сбой. Разберёмся, как ERB и Rails борются с XSS, и где разработчики сами открывают двери для атак.

---

## 🔒 Как Rails защищает от XSS по умолчанию

### Автоматическое экранирование в ERB
Rails использует ERB (Embedded Ruby) для шаблонов, и **по умолчанию все строки экранируются**:

```erb
<%= @user_input %> <!-- Безопасно: < превратится в &lt; -->
```

Это работает благодаря методу `html_escape`, который вызывается автоматически для всех строк, не помеченных как "безопасные".

### `raw` и `html_safe`: когда осторожность отключается
Но если явно указать, что строка "безопасна", экранирование отключается:

```erb
<%= raw @user_input %> <!-- Опасно! -->
<%= @user_input.html_safe %> <!-- Тоже опасно! -->
```

**Пример уязвимости:**
```ruby
# Контроллер
def show
  @comment = params[:comment]
end
```

```erb
<!-- Вьюха -->
<div class="comment">
  <%= raw @comment %> <!-- XSS-атака возможна! -->
</div>
```

---

## 💥 Где чаще всего ошибаются

### 1. JSON в JavaScript
```erb
<script>
  var data = <%= raw @user_data.to_json %>; <!-- Уязвимость! -->
</script>
```
**Решение:** Используйте `json_escape` или `to_json.html_safe` с осторожностью.

### 2. Динамические CSS/JavaScript
```erb
<style>
  .profile { background: url(<%= @user_background %>); }
</style>
```
**Атака:** `@user_background = 'red;}</style><script>alert(1)</script><style>'`.

### 3. Ошибки в хелперах
```ruby
def custom_link(text, url)
  "<a href='#{url}'>#{text}</a>".html_safe
end
```
**Проблема:** Не экранируются `text` и `url`.

---

## 🛡️ Как защититься: лучшие практики

### 1. Всегда экранируйте по умолчанию
```erb
<%= @user_input %> <!-- Так правильно -->
```

### 2. Используйте `sanitize` для HTML
```erb
<%= sanitize @user_html, tags: %w[a b i], attributes: %w[href] %>
```

### 3. Content Security Policy (CSP)
Добавьте в `config/initializers/content_security_policy.rb`:
```ruby
Rails.application.config.content_security_policy do |policy|
  policy.default_src :self
  policy.script_src :self, :https
end
```

### 4. Проверяйте данные перед вставкой в JavaScript
```erb
<script>
  var data = <%= @user_data.to_json.html_escape %>;
</script>
```

---

## 🧪 Тестируем защиту

### Тест на уязвимость в RSpec
```ruby
describe "CommentsController" do
  it "экранирует HTML в комментариях" do
    post :create, params: { comment: '<script>alert(1)</script>' }
    expect(response.body).not_to include('<script>')
  end
end
```

### Используйте Brakeman
Добавьте в Gemfile:
```ruby
gem 'brakeman', require: false
```
И запустите:
```bash
brakeman -q -w2
```

---

## 🎤 Что сказать на собеседовании

> — Как Rails защищает от XSS?

— ERB автоматически экранирует все строки, но разработчик может отключить защиту через `raw` или `html_safe`. Важно избегать вставки непроверенных данных в JavaScript/CSS и использовать CSP.

---

## 🧾 Вывод

Rails даёт отличные инструменты для защиты от XSS, но они требуют осознанного использования. **Автоматическое экранирование — не волшебная палочка**, а `html_safe` — не "удобная фича", а потенциальная дыра. Проверяйте данные, используйте CSP и помните: безопасность — это процесс, а не разовая настройка.
