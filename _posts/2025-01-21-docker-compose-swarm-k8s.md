---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Docker и его друзья: Compose, Swarm, K8s'
date: '2024-09-18 12:00:00 +0300'
categories:
- devops
- architecture
tags: Docker,DevOps,Ruby on Rails,PostgreSQL,масштабируемость
rate: 3
hero_image: "/images/posts/background_post-0087.webp"
---
Docker изменил правила игры в разработке и деплое приложений, но одинокий контейнер — лишь начало истории. В статье разберём, как его друзья — Compose, Swarm и Kubernetes — помогают строить отказоустойчивые системы, и покажем их интеграцию с Ruby on Rails и PostgreSQL.

---
Вы только что завершили новый фич-флаг в Rails-приложении.  
`docker build -t myapp .` → `docker run -p 3000:3000 myapp` — и оно работает!  
Но что дальше? Как запустить 10 контейнеров с балансировкой? Как управлять секретами?  
Время познакомиться с **экосистемой Docker**.

---

## 🐳 Docker: контейнеры как LEGO

### Основы
Docker упаковывает приложение со всеми зависимостями в **изолированный контейнер**:
- Нет "у меня на локале работало"
- Одинаковая среда от разработки до продакшена
- Быстрый запуск (vs виртуальных машин)

**Пример Dockerfile для Rails:**
```dockerfile
FROM ruby:3.2
RUN apt-get update && apt-get install -y postgresql-client
WORKDIR /app
COPY Gemfile* ./
RUN bundle install
COPY . .
CMD ["rails", "server", "-b", "0.0.0.0"]
```

---

## 🎻 Docker Compose: оркестр для разработчика

### Зачем?
Когда ваш проект состоит из:
- Rails-сервера
- PostgreSQL
- Redis
- Sidekiq
- Elasticsearch

Ручной запуск каждого контейнера превращается в ад. **Compose** описывает всю систему в YAML.

**Пример `docker-compose.yml`:**
```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    volumes:
      - db_data:/var/lib/postgresql/data
  web:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
volumes:
  db_data:
```

Запуск: `docker-compose up -d`

### Антипаттерны
1. **Жирные контейнеры**: один контейнер = один процесс (не веб-сервер + воркер + cron)
2. **Хардкод секретов**: используйте `env_file` или Docker Secrets
3. `depends_on` не ждёт готовности БД → нужны healthchecks

---

## 🐝 Docker Swarm: кластеризация "на минималках"

### Когда выбирать?
- Нужна отказоустойчивость без сложностей Kubernetes
- Маленькая/средняя инфраструктура
- Быстрый старт с минимальным обучением

**Развёртывание:**
```bash
docker swarm init  # на первом узле
docker stack deploy -c docker-compose.prod.yml myapp
```

**Плюсы:**
- Встроенный overlay-сеть и балансировщик
- Сервисы масштабируются одной командой
- Rolling updates без даунтайма

**Ограничения:**
- Нет автоматического масштабирования
- Меньше возможностей мониторинга vs K8s

---

## ☸️ Kubernetes: промышленный стандарт

### Почему все говорят про K8s?
Когда Swarm уже мал:
- 100+ микросервисов
- Автоскейлинг по метрикам
- Сложные CI/CD пайплайны

**Основные концепции:**
- **Pod**: минимальная единица (1+ контейнеров)
- **Deployment**: управление версиями и репликами
- **Service**: сетевой доступ к подам
- **Ingress**: маршрутизация HTTP-трафика

**Пример `deployment.yml` для Rails:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: myapp:latest
        ports:
        - containerPort: 3000
```

---

## 🔥 Боли реального мира

### 1. Миграции БД в Kubernetes
**Плохо:**
```yaml
command: ["rails", "db:migrate && rails server"]
```
**Решение:** Jobs для миграций + initContainers для проверки готовности БД.

### 2. Секреты
- Swarm: `docker secret create`
- K8s: `Secret`-ресурсы + vault-интеграции

### 3. Логирование
Без централизованного сбора логов в кластере — вы слепы. Варианты:
- ELK-стек
- Loki + Grafana
- Cloud-решения (AWS CloudWatch, GCP Stackdriver)

---

## � Что выбрать для Ruby-проекта?

| Инструмент       | Когда использовать                     | Пример использования               |
|------------------|---------------------------------------|------------------------------------|
| Docker           | Локальная разработка                  | `docker run -p 3000:3000 myapp`    |
| Compose          | Dev-окружение, демо-стенды            | Запуск полного стека (Rails+PG+Redis) |
| Swarm            | Простые продакшн-кластеры             | Small/medium SaaS                  |
| Kubernetes       | Микросервисы, высокие нагрузки        | Enterprise-приложения              |

**Личный опыт:**  
Для монолита на Rails с 5-10 сервисами Swarm — отличный баланс сложности/возможностей.  
Когда появляются 15+ микросервисов с разными версиями Ruby — время переезжать в Kubernetes.

---

## 🎤 Что спросят на собеседовании

> — Как бы вы развернули Rails-приложение с фоновыми воркерами в K8s?

— Использовал бы Deployment для веб-сервера и отдельный Deployment для Sidekiq. Для миграций — Job с ручным запуском или хуком в CI/CD. Секреты через Secrets или внешний Vault.

---

## 🧾 Вывод

Docker — это дверь в мир контейнеризации, но настоящая магия начинается с оркестрации:
- **Compose** — для локальной разработки,  
- **Swarm** — для простых продакшн-сетапов,  
- **Kubernetes** — когда нужна "тяжёлая артиллерия".  

Главное — не переусложнить. Иногда `docker-compose.prod.yml` решает все задачи малого бизнеса без головной боли K8s.
