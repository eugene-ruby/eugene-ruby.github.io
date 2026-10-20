---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: "\U0001F510 Секреты — не секрет! Как не отдать ключи от проекта в первый же
  день"
date: '2024-10-12 14:00:00 +0300'
categories:
- pet
- ruby
tags: Pet,GitHub,Secrets
rate: 4
hero_image: "/images/posts/background_post-0083.webp"
---
Вы только начали pet-проект: база работает, API отвечает, бот в Telegram шлёт котиков. И вдруг — случайный коммит с `TOKEN=abc123` в публичный репозиторий. История знает сотни таких случаев, когда разработчики теряли доступ к API или получали счёт на $50.000 за облачные сервисы. Разберём минимальный, но эффективный стек для защиты секретов в Ruby-проектах.

---

## 💀 История из интернетов

```bash
+ Дедлайн через 2 часа
+ Надо срочно задеплоить фичу
+ git add . && git commit -m "fix auth"
+ git push
# Через 15 минут: 
- "Почему наш бот рассылает рекламу? 🔞"
```

**Мораль**: секреты утекают не из-за злого умысла, а по невнимательности. Защищать их нужно с первого коммита.

---

## 🧠 Теория: что такое секрет в XXI?

Это любая строка, которая даёт доступ:
- API-ключи (Telegram Bot Token, OpenAI, Stripe)
- Креды базы данных (`postgres://user:password@host`)
- Ключи шифрования (Rails `secret_key_base`)
- OAuth-клиенты (`GOOGLE_CLIENT_SECRET=abc123`)

**Главное правило**: они никогда не должны попадать в Git-историю.

---

## 🛡️ Защитный стек для Ruby-проекта

### 1. `.env` + `dotenv` — локальная разработка

Устанавливаем гем:

```ruby
# Gemfile
gem 'dotenv-rails', groups: [:development, :test]
```

Создаём `.env` (уже в `.gitignore`!):

```bash
# .env
DATABASE_URL="postgres://user:password@localhost:5432/pet_project"
TELEGRAM_TOKEN="123:abc"
```

И подгружаем в `application.rb`:

```ruby
# config/application.rb
Bundler.require(*Rails.groups)
Dotenv::Railtie.load if %w[development test].include?(Rails.env)
```

⚠️ **Проверьте**: `git check-ignore .env` должен вернуть путь.

---

### 2. `.gitignore` — последний рубеж

Даже если забыли `git add .env`, `.gitignore` спасёт:

```gitignore
# .gitignore
.env
*.env.local
.env*.local
```

---

### ❌ Антипаттерн: молчать, если переменной окружения нет

Худшее, что можно сделать — **молча пропустить ошибку** или, ещё хуже, подставить дефолтное значение:

```yaml
# config/database.yml — плохо!
production:
  password: <%= ENV['DB_PASS'] %>
```

```yaml
# config/database.yml — ещё хуже!
production:
  password: <%= ENV.fetch('DB_PASS', 'password') %> 
```

---

### ✅ Как правильно: fail fast

Если важной переменной окружения нет — пусть приложение **упадёт сразу**, громко и понятно:

```yaml
# config/database.yml — хорошо!
production:
  password: <%= ENV.fetch('DB_PASS') %>
```

📌 Это гарантирует, что вы не запустите прод с пустым или случайным значением. Лучше сломаться на старте, чем пропустить уязвимость.

---

### 3. GitHub Secrets — безопасный деплой

Для GitHub Actions:

1. Идём в `Settings → Secrets → Actions`
2. Добавляем ключи (например, `RAILS_MASTER_KEY`)
3. Используем в workflow:

{% raw %}
```yaml
# .github/workflows/deploy.yml
env:
  DATABASE_URL: ${{ secrets.PROD_DB_URL }}
steps:
  - run: rails db:migrate
```
{% endraw %}

**Важно**: никогда не логируйте секреты!

```ruby
# Плохо:
Rails.logger.info("Connected to #{ENV['DB_URL']}") 
# Хорошо:
Rails.logger.info("Connected to database") 
```

---

## 💥 Реальные кейсы утечек

### Кейс 1: Rails `secret_key_base` в открытом доступе
- **Что случилось**: разработчик закоммитил `config/secrets.yml` с продакшн-ключом.
- **Последствия**: атакующие подделывали куки и получали доступ к админке.
- **Решение**: `credentials.yml.enc` + `master.key` в `.gitignore`.

### Кейс 2: AWS S3 Bucket с правами на запись
- **Что случилось**: ключи попали в историю Git, бот начал заливать мемы в бакет.
- **Последствия**: счёт за трафик — $300/месяц.
- **Решение**: IAM-роли с минимальными правами + регулярная ротация.

---

## 🧪 Тестируем безопасность

1. Проверяем утечки в истории:
```bash
git log -p | grep -E 'password|token|key'
```

2. Сканируем зависимости:
```ruby
# Gemfile
gem 'bundler-audit'
gem 'brakeman'
```

3. Автоматизируем проверки в CI:
```yaml
# .github/workflows/security.yml
- name: Audit gems
  run: bundle audit check --update
```

---

## 🎤 Что сказать на собеседовании

> — Как вы храните секреты в проектах?

— Мы используем многоуровневую защиту: `.env` с `dotenv` для разработки, зашифрованные credentials для Rails, GitHub Secrets для CI/CD. Все ключи ротируются, а доступ логируется.

---

## � Вывод

**Секреты — как зубная щётка: нельзя давать другим, даже "на минуточку".**  
Минимальный стек защиты (`dotenv` + `.gitignore` + Secrets) займёт 15 минут, но спасёт от:
- Удалённых ботов 🤖
- Взломанных баз 🗄️
- Неожиданных счетов 💸  
Начните с малого — и спите спокойно.  
