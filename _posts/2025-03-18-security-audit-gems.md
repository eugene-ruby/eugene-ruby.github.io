---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Brakeman, Bundler Audit и другие: Ruby-гемы для безопасности'
date: '2024-09-18 10:00:00 +0300'
categories:
- security
- ruby
tags: Gem,безопасность,DevOps,аудит,уязвимости
rate: 2
hero_image: "/images/posts/background_post-0031.webp"
---
Безопасность в Ruby-приложениях — это не только про HTTPS и сложные пароли. Это про ежедневную рутину: обновления гемов, поиск уязвимостей в коде и автоматизацию проверок. Разберём инструменты, которые спасут ваш бэкенд от SQL-инъекций, устаревших зависимостей и других "подарков" из интернета.

---

## 🔍 Почему стандартных практик недостаточно?

Вы уверены, что:
- Все гемы в `Gemfile.lock` безопасны?
- В ваших шаблонах нет XSS?
- Никто не забыл про `strong_params` в новом контроллере?

**Ответы "на глазок" не работают.** Нужны инструменты, которые сканируют проект автоматически — как охранник с металлодетектором на входе в аэропорт.

---

## 🛡️ Brakeman: статический анализатор для Rails

### Что делает?
Сканирует код на:
- SQL-инъекции (`User.where("name = '#{params[:name]}'")`),
- XSS (`<%= raw @comment.text %>`),
- массовое присваивание (`User.update(params[:user])`),
- и ещё [50+ уязвимостей](https://brakemanpro.com/security_warnings).

### Установка:
```bash
gem install brakeman
brakeman -o report.html
```

### Пример отчёта:
```text
+------------+-------+
| Confidence | High  |
+------------+-------+
| Warning    | SQL Injection in User.search |
| File       | app/models/user.rb:42 |
| Code       | User.where("login LIKE '%#{params[:q]}%'") |
+------------+-------+
```

### Интеграция в CI:
```yaml
# .github/workflows/security.yml
- name: Brakeman
  run: brakeman -z --no-pager
```

**Плюсы:**
- Не требует запуска приложения.
- Проверяет даже комментарии в миграциях.

**Минусы:**
- Ложные срабатывания (например, на `sanitize_sql`).
- Не ищет проблемы в JavaScript.

---

## 📦 Bundler Audit: проверка зависимостей

### Зачем?
Устаревший гем = потенциальная дыра. Например, `rack` до 2.1.4 допускает [RCE](https://nvd.nist.gov/vuln/detail/CVE-2020-8184).

### Использование:
```bash
gem install bundler-audit
bundle-audit check --update
```

Вывод:
```text
Name: actionpack
Version: 5.2.3
Advisory: CVE-2020-8166
Criticality: Medium
URL: https://groups.google.com/.../rubyonrails-security/1hPWx...
Title: Possible XSS in Action Pack
Solution: upgrade to >= 5.2.4.3
```

### Автоматизация:
Добавьте в `Rakefile`:
```ruby
task :security do
  sh "bundle-audit check --update"
end
```

**Совет:** Запускайте `bundle-audit` после каждого `bundle install` через `post_install`-хук.

---

## 🔎 Другие инструменты

### 1. `ruby_audit`
Проверяет версию Ruby на известные CVE:
```bash
gem install ruby_audit
ruby-audit check
```

### 2. `bundler-outdated`
Ищет устаревшие гемы (не только уязвимые):
```bash
bundle outdated --strict
```

### 3. `rails_best_practices`
Анализирует архитектурные риски:
```bash
gem install rails_best_practices
rails_best_practices .
```

Пример предупреждения:
```text
Don't use default_scope (app/models/user.rb:5)
```

---

## 💀 Антипаттерны безопасности

### 1. "У нас маленький проект — зачем аудит?"
Ответ: Взломы часто автоматизированы — боты сканируют даже пет-проекты.

### 2. "Обновим гемы, когда будет время"
Пример: В 2019 году через уязвимость в `activestorage` ([CVE-2019-5421](https://nvd.nist.gov/vuln/detail/CVE-2019-5421)) атаковали тысячи Rails-приложений.

### 3. "Brakeman ругается — закомментируем его в CI"
Лучше:
```ruby
# config/brakeman.yml
skip_checks: ["CheckRedirect"]
```

---

## 🛠️ Практика: настраиваем пайплайн

1. **Локально**: Хуки в `overcommit`:

```yaml
PreCommit:
  Brakeman:
    enabled: true
    command: ['brakeman', '-q', '-z']
```

2. **CI**: Полный аудит перед деплоем:

```yaml
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: gem install brakeman bundler-audit
      - run: brakeman -z --no-pager
      - run: bundle-audit check --update
```

3. **Мониторинг**: Еженедельные отчеты через `cron` + Slack-бот.

---

## 🎯 Вывод

- **Brakeman** — сканер кода, ловит "хардкод-инъекции".
- **Bundler Audit** — детектор уязвимых гемов.
- **Автоматизация** — единственный способ не забыть про безопасность.

Как сказал один мудрый DevOps:  
*"Лучше красный CI, чем красные глаза от ночного инцидента"*. 🔥
