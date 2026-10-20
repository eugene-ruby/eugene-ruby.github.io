---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Docker-образы как чемоданы: как собрать быстро и не тащить лишнее'
date: '2024-09-21 12:00:00 +0300'
categories:
- devops
- pet
tags: Docker,CI/CD,оптимизация,DevOps,контейнеризация
rate: 2
hero_image: "/images/posts/background_post-0096.webp"
---
Сборка Docker-образов превращается в квест на выживание, когда каждый `docker build` занимает 15 минут, а итоговый образ весит как гиппопотам? В статье разберём стратегии оптимизации — от базовых принципов до продвинутых техник кэширования, которые сократят время сборки в разы и облегчат ваш CI/CD-конвейер.

---
Вы нажимаете `docker build -t my-app .` и идёте пить кофе…  
А потом ещё один. И ещё.  
Пора менять подход — **Docker не должен быть тормозом**.

---

## 🐢 Почему образы собираются медленно?

Типичные причины:

1. **Слоистая бюрократия** — Dockerfile выполняется последовательно, и каждый `RUN`, `COPY` создаёт новый слой
2. **Пересборка неизменного** — `apt install` запускается при любом изменении в коде
3. **Мусор в финале** — в образ попадают кэши пакетных менеджеров, временные файлы

Пример проблемного Dockerfile:

```dockerfile
FROM ubuntu:latest
COPY . /app      # ← Любое изменение кода сбросит кэш ниже
RUN apt update && apt install -y ruby-dev nodejs
RUN bundle install
RUN npm install
CMD ["rails", "server"]
```

---

## 🧠 Принцип: "Меняется редко — ставь выше"

**Слои Dockerfile кэшируются сверху вниз**. Если изменилась команда на 4-й строке — всё ниже пересобирается.

Решение:  

1. Размещайте редко меняющиеся операции (установка системных пакетов) **в начале**
2. Часто меняющиеся (код приложения) — **в конце**

---

## 🛠️ Практика: оптимизированный Dockerfile

```dockerfile
# Базовый образ с предустановленными зависимостями
FROM ruby:3.2-alpine AS base

# Установка системных пакетов (кэшируется)
RUN apk add --no-cache build-base nodejs postgresql-dev

# Отдельный слой для гемов (кэшируется, если не изменился Gemfile)
COPY Gemfile Gemfile.lock .
RUN bundle install --jobs=4 --retry=3

# Отдельный слой для npm (кэшируется, если не изменился package.json)
COPY package.json yarn.lock .
RUN yarn install --frozen-lockfile

# Копируем код приложения (часто меняется — идёт последним)
COPY . .

CMD ["rails", "server"]
```

**Что изменилось:**

- Используем легковесный `alpine`-образ
- Разделили установку гемов и npm-пакетей в отдельные слои
- Код копируем в последнюю очередь

---

## 🐘 Как уменьшить вес образа?

1. **Многоступенчатая сборка** — оставляем только нужные артефакты
2. **Чистка после установки** — удаляем кэши пакетных менеджеров
3. **Игнорирование мусора** — правильный `.dockerignore`

Пример для Rails-приложения:

```dockerfile
# Этап сборки
FROM ruby:3.2 AS builder

WORKDIR /app
COPY . .
RUN bundle install && \
    rails assets:precompile && \
    rm -rf node_modules tmp/* log/*

# Финальный образ
FROM ruby:3.2-alpine

COPY --from=builder /app /app
WORKDIR /app
CMD ["rails", "server"]
```

Размер уменьшился с 1.8GB до 420MB!

---

## 🔥 Антипаттерны

| Ошибка                          | Последствия                     | Как исправить                  |
|---------------------------------|---------------------------------|--------------------------------|
| `COPY . .` в начале Dockerfile  | Инвалидация кэша на каждом билде | Копировать код последним       |
| Не очищать кэши пакетов         | Раздутые образы                 | `apt clean`, `rm -rf /var/lib/apt/lists/*` |
| Один гигантский `RUN`           | Невозможность кэширования       | Разделять на логические этапы  |

---

## 🚀 Продвинутая оптимизация: базовые образы

**Проблема:** В CI/CD каждый прогон заново устанавливает Ruby, PostgreSQL-client и прочие зависимости.

**Решение:** Создать кастомный базовый образ и выкладывать его в registry.

```dockerfile
# Dockerfile.base
FROM ruby:3.2-alpine
RUN apk add --no-cache build-base nodejs postgresql-dev
```

Собираем и пушим:
```bash
docker build -t my-registry/base-rails:latest -f Dockerfile.base .
docker push my-registry/base-rails:latest
```

Теперь в основном Dockerfile:
```dockerfile
FROM my-registry/base-rails:latest  # ← Все зависимости уже здесь!
```

**Эффект:** Сборка из 15 минут → 2 минуты.

---

## 🤖 CI/CD: стратегии сборки

**Плохо:**  
```yaml
# .gitlab-ci.yml (плохой пример)
deploy:
  script:
    - docker build -t my-app .  # Собираем с нуля каждый раз
    - docker push my-app
```

**Хорошо:**  
```yaml
# .gitlab-ci.yml (оптимизированный)
build:
  stage: build
  only:
    - master
  script:
    - docker pull my-registry/base-rails:latest || true
    - docker build --cache-from my-registry/base-rails:latest -t my-app .
    - docker push my-app
```

---

## 🧪 Проверка эффективности

Полезные команды для анализа:
{% raw %}
```bash
# Показывает размер образов
docker images

# Анализирует слои образа
docker history my-app

# Показывает вес каждого слоя
docker inspect my-app --format='{{.RootFS.Layers}}' | tr ' ' '\n' | xargs -I {} sh -c 'echo {}; docker inspect --format="{{.Size}}" {}'
```
{% endraw %}

---

## 🎤 Что сказать на собеседовании

> — Как вы оптимизируете Docker-образы для production?

— Мы используем многоступенчатую сборку, кастомные базовые образы с кэшированными зависимостями и строгий `.dockerignore`. Это сокращает время сборки с 20 до 3 минут и уменьшает образы на 70%.

---

## 🧾 Вывод

**Оптимизация Docker — это баланс между кэшированием и минимализмом.**  
Правильно структурированный Dockerfile экономит часы CI/CD-раннеров, гигабайты трафика и ваши нервы.  

Главные правила:  
1. **Меняется редко — ставь выше**  
2. **Разделяй и кэшируй**  
3. **Не тащи мусор в продакшен**  

Теперь ваш `docker build` будет быстрым как гепард, а образы — лёгкими как перо. 🚀
