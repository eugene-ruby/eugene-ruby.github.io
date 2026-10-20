---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Docker для pet-проекта: как избежать «у меня на локалке работало»'
date: '2024-10-10 12:00:00 +0300'
categories:
- pet
- ruby
tags: Docker,Ruby on Rails,Pet
rate: 2
hero_image: "/images/posts/background_post-0063.webp"
---
Вы только что написали свой первый Rails-проект. На локальной машине всё летает, но при попытке запустить его на сервере вы получаете ошибки в духе «Gem::Ext::BuildError» или «Postgresql version mismatch». Знакомо? Docker решает эти проблемы раз и навсегда — и вот как начать им пользоваться уже сегодня.

---

## 🐋 Почему Docker — это не «для продвинутых»

### Миф: «Я же только учусь, зачем мне Docker?»
**Правда:** Docker не усложняет, а упрощает жизнь новичку:
- Больше не нужно ставить вручную Ruby, Postgres, Redis.
- Не будет конфликтов версий («А у меня Ruby 3.3, а не 2.7!»).
- Легко поделиться проектом: друг запустит его одной командой.

Пример боли без Docker:
```bash
# После часов настройки сервера:
rails db:migrate
# => PG::ConnectionBad: FATAL:  database "myapp_development" does not exist
# (А где вообще мой Postgres?!)
```

---

## 🛠️ Практика: Docker для Rails + Postgres

### Шаг 1. Установка Docker
- [Официальная инструкция](https://docs.docker.com/get-docker/) для вашей ОС.
- Проверяем: `docker --version` и `docker-compose --version`.

### Шаг 2. Создаём `Dockerfile`
В корне проекта:
```dockerfile
# Используем официальный образ Ruby
FROM ruby:3.2

# Устанавливаем зависимости
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    nodejs

# Создаём директорию приложения
WORKDIR /app

# Копируем Gemfile и устанавливаем гемы
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Копируем весь код
COPY . .

# Порт, который будет слушать Rails
EXPOSE 3000

# Команда для запуска
CMD ["rails", "server", "-b", "0.0.0.0"]
```

 🤓 Загляни в полезную статью: [Как не собирать жирный Docker образ](/posts/slow-fat-docker-image)

### Шаг 3. Пишем `docker-compose.yml`
```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: password

  web:
    build: .
    command: bash -c "rm -f tmp/pids/server.pid && rails server -b 0.0.0.0"
    volumes:
      - .:/app
    ports:
      - "3000:3000"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgres://postgres:password@db:5432

volumes:
  postgres_data:
```

### Шаг 4. Запускаем!
```bash
docker-compose build
docker-compose up
```
Теперь ваш Rails-проект доступен на `localhost:3000`, а Postgres автоматически создан и подключён.

---

## 💡 Лайфхаки для новичков

### 1. Как работать с базами данных
**Проблема:** «Где мои данные? Они исчезают при перезапуске!»  
**Решение:** Volumes в `docker-compose.yml` (как в примере выше) сохраняют данные между запусками.

### 2. Как дебажить

```bash
# Залогиниться в контейнер:
docker-compose exec web bash

# Посмотреть логи Postgres:
docker-compose logs db
```

### 3. Как не пересобирать образ каждый раз
Используйте `volumes` для монтирования кода (как в `docker-compose.yml` выше), тогда изменения в файлах будут сразу видны.

---

## 🔥 Типичные ошибки

| Ошибка                          | Как исправить                     |
|---------------------------------|----------------------------------|
| «Не видит базу данных»          | Проверьте `DATABASE_URL` в `environment` |
| «Gemfile.lock конфликтует»      | Удалите его локально и пересоберите образ |
| «Порт уже занят»                | Измените `ports` в `docker-compose.yml` |

Пример рабочего `database.yml` для Docker:

```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  host: db
  username: postgres
  password: password
  pool: 5

development:
  <<: *default
  database: myapp_development
```

---

## 🚀 **Деплой на VPS**:   

```bash
git clone ваш_проект && cd ваш_проект && docker-compose up
```

🤓 Загляни в полезную статью: [CI/CD проще, чем кажется](/posts/github-ssh-action-pet-deploy.html)

---

## 🧾 Вывод

**Docker — это не сложно.**  
Это ваш страховой полис от «оно работало на моей машине». Потратьте 2 часа сегодня — сэкономите 20 часов завтра. И да, теперь вы можете сказать на собеседовании: «Я использую Docker в своих проектах».

---

> 🔐 В этой статье мы не касаемся безопасного хранения паролей и секретов — всё показано максимально просто, чтобы не перегружать материал. Не используйте такие подходы в проде — [для этого есть специальные инструменты](/posts/dotenv-pet-secrets.html)