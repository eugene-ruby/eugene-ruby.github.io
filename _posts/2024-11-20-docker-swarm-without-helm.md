---
layout: post
subtitle: <div id="terminal"></div>
title: "DevOps для тех, кто не хочет Helm: настройка Docker Swarm шаг за шагом"
date: 2024-11-20 14:00:00 +0300
rate: 4
tags: Docker, DevOps, Swarm, PostgreSQL, оркестрация
version: A9X
categories:
  - devops
  - architecture
hero_image: /images/posts/51.jpg
hero_darken: true
toc: true
menubar_toc: true
---

Helm — это мощно, но иногда хочется чего-то попроще, особенно когда ваш стек — Ruby on Rails + PostgreSQL, а не гигантский микросервисный зоопарк. Docker Swarm — это встроенная оркестрация "из коробки", которая справится с большинством задач без YAML-ада в 500 строк. Разберём, как развернуть Swarm-кластер для Rails-приложения, избежав типичных граблей.

---

## 🧠 Теория: зачем Swarm, если есть Kubernetes?

Docker Swarm — это:
- **Встроенная оркестрация** (не надо ставить отдельные компоненты)
- **Проще конфиги** (всё в Docker Compose-стиле)
- **Меньше boilerplate-кода** (идеально для монолитов и небольших сервисов)

Kubernetes — это как управлять космическим кораблём, когда вам нужно просто переплыть реку. Swarm — ваша лодка с мотором.

---

## 🛠️ Практика: разворачиваем Swarm для Rails + PostgreSQL

### 1. Инициализируем Swarm на manager-ноде

```bash
docker swarm init --advertise-addr <MANAGER_IP>
```

Получаем токен для подключения worker-нод:

```bash
docker swarm join-token worker
```

### 2. Подготавливаем `docker-compose.yml`

```yaml
version: '3.8'

services:
  app:
    image: your-rails-app:latest
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/app_prod
    depends_on:
      - db

  db:
    image: postgres:14
    deploy:
      placement:
        constraints: [node.role == manager]
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: "your_strong_password"

volumes:
  pg_data:
```

### 3. Запускаем стек

```bash
docker stack deploy -c docker-compose.yml myapp
```

Проверяем:

```bash
docker service ls
```

---

## 🔥 Антипаттерны и грабли

### 1. "Оно не масштабируется!"
Swarm действительно проигрывает Kubernetes при горизонтальном масштабировании 50+ сервисов. Но для 3-5 сервисов (Rails, Sidekiq, PostgreSQL, Redis) — идеально.

### 2. "Где мои переменные окружения?"
Не храните секреты в compose-файле. Используйте:

```bash
echo "my_secret" | docker secret create db_password -
```

И в конфиге:

```yaml
db:
  image: postgres
  secrets:
    - db_password
```

### 3. "Почему реплики PostgreSQL не работают?"
Swarm не заменяет настройку репликации БД. Для PostgreSQL используйте:

```yaml
deploy:
  placement:
    constraints: [node.role == manager]
```

И настраивайте репликацию отдельно.

---

## � Пример для Rails + Sidekiq

```yaml
services:
  web:
    image: rails-app
    ports:
      - "3000:3000"
    deploy:
      replicas: 3

  sidekiq:
    image: rails-app
    command: bundle exec sidekiq -C config/sidekiq.yml
    deploy:
      replicas: 2
    environment:
      - REDIS_URL=redis://redis:6379/1

  redis:
    image: redis:7
    deploy:
      placement:
        constraints: [node.role == manager]
```

---

## 🧪 Как тестировать?

1. Локально с `docker-compose` (те же конфиги!)
2. В CI добавляем:

```bash
docker swarm init --advertise-addr 127.0.0.1
docker stack deploy -c docker-compose.ci.yml test_stack
```

3. Для production-like тестов используйте `docker-compose.override.yml`

---

## 🎤 Что сказать на собеседовании

> — Почему Swarm, а не Kubernetes?

— Наш стек — монолит Rails + PostgreSQL, Swarm покрывает все потребности с меньшими накладными расходами. Мы развернули кластер за день, а не за неделю.

---

## 🧾 Вывод

**Docker Swarm — это DevOps без ритуальных танцев с YAML.**  
Если ваше приложение — это Rails + несколько сервисов, Swarm даст вам оркестрацию "из коробки" без необходимости изучать kubectl как новый язык программирования. А время, сэкономленное на настройке, можно потратить на фичи, а не на конфиги.
