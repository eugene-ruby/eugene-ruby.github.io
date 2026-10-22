---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'DevOps для тех, кто не хочет Helm: настройка Docker Swarm шаг за шагом'
short_description: 'Как развернуть Rails-приложение и PostgreSQL в Docker Swarm: создать
  стек, передать пароль через secret и учесть ограничения томов, порядка запуска и
  тестирования.'
date: '2024-11-20 14:00:00 +0300'
categories:
- database
- devops
tags:
- Containerization
- Deployment
- Orchestration
- Replication
- Scalability
- Secrets Management
- Testing
rate: 4
hero_image: "/images/posts/background_post-0054.webp"
---
Helm — это мощно, но для небольшого стека Rails + PostgreSQL иногда хочется обойтись без Kubernetes. Docker Swarm встроен в Docker и позволяет развернуть сервисы из Compose-файла. Разберём базовую настройку и места, где простота Swarm не отменяет работы с секретами, данными и запуском приложения.

---

## 🧠 Теория: зачем Swarm, если есть Kubernetes?

Docker Swarm даёт оркестрацию без отдельной установки Kubernetes: сервисы, реплики, сеть между сервисами и развёртывание стека из Compose-файла. Для небольшого приложения этого может быть достаточно. Выбор зависит не только от числа сервисов, но и от требований к отказоустойчивости, хранению данных и эксплуатации.

---

## 🛠️ Практика: разворачиваем Swarm для Rails + PostgreSQL

### 1. Инициализируем Swarm на manager-ноде

```bash
docker swarm init --advertise-addr <MANAGER_IP>
```

Если будут worker-ноды, получаем команду для их подключения:

```bash
docker swarm join-token worker
```

Адрес manager-ноды должен быть доступен другим нодам. Для примера с несколькими нодами также понадобится образ Rails-приложения в реестре, доступном каждой из них: локальный образ на manager-ноде не появится на workers автоматически.

### 2. Подготавливаем `docker-compose.yml`

Сначала создаём secret с паролем. Значение ниже — заглушка: для реального развёртывания используйте свой пароль. В примере пароль должен быть пригоден для включения в URL; если это не так, его нужно корректно закодировать для `DATABASE_URL`.

```bash
printf '%s' 'replace-with-url-safe-password' | docker secret create db_password -
```

```yaml
version: '3.8'

services:
  app:
    image: your-rails-app:latest
    ports:
      - "3000:3000"
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
    secrets:
      - db_password
    command: >-
      sh -c 'export DATABASE_URL="postgresql://user:$$(cat /run/secrets/db_password)@db:5432/app_prod";
      exec bundle exec rails server -b 0.0.0.0 -p 3000'

  db:
    image: postgres:14
    deploy:
      placement:
        constraints: [node.hostname == db-node]
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: user
      POSTGRES_DB: app_prod
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

volumes:
  pg_data:

secrets:
  db_password:
    external: true
```

Замените `db-node` на имя ноды, где должен находиться том PostgreSQL, а `your-rails-app:latest` — на доступный нодам образ приложения. В строке команды `$$` оставляет знак доллара для оболочки внутри контейнера: пароль читается при запуске Rails, а не подставляется при обработке Compose-файла. При этом он окажется в переменной окружения процесса Rails — secret не устраняет все способы доступа к паролю внутри контейнера.

Именованный том с обычным локальным драйвером привязан к конкретной ноде. Ограничение по `node.hostname` удерживает PostgreSQL рядом с его данными, но **не делает базу отказоустойчивой**: если нода недоступна, Swarm не перенесёт её данные на другую. Для этого нужны отдельное решение по хранению и резервному копированию либо внешняя БД.

В стеке не используем `depends_on` как гарантию готовности PostgreSQL: `docker stack deploy` не обеспечивает такой порядок запуска. Приложению может понадобиться ожидание доступности БД; миграции также нужно запускать отдельно.

### 3. Запускаем стек

```bash
docker stack deploy -c docker-compose.yml myapp
```

Смотрим состояние сервисов и задач:

```bash
docker service ls
docker service ps myapp_app
docker service ps myapp_db
```

`docker stack deploy` запускает развёртывание, но завершение команды ещё не означает, что приложение готово принимать запросы.

---

## 🔥 Антипаттерны и грабли

### 1. «Оно не масштабируется!»

Swarm умеет запускать несколько реплик Rails, но количество реплик не решает вопросы хранения данных, миграций и устойчивости PostgreSQL. Для небольшого стека он может быть удобнее Kubernetes; универсального порога по числу сервисов, после которого один вариант обязательно лучше другого, нет.

### 2. «Где мои переменные окружения?»

Не записывайте пароль БД прямо в Compose-файл. В примере выше `db_password` монтируется в сервисы как файл: PostgreSQL читает его через `POSTGRES_PASSWORD_FILE`, а Rails — при формировании `DATABASE_URL`. Если меняете пароль уже работающей БД, одной замены secret недостаточно: учётные данные в самой PostgreSQL тоже нужно обновить согласованно.

### 3. «Почему реплики PostgreSQL не работают?»

`deploy.replicas` создаёт контейнеры, а не репликацию данных PostgreSQL. Ограничение размещения на одной ноде тоже не создаёт реплику. Если нужны репликация или автоматическое переключение БД при сбое, их придётся настраивать отдельно.

---

## 🧩 Пример для Rails + Sidekiq

Если приложение использует Sidekiq, к стеку можно добавить сервисы `sidekiq` и `redis`. Это фрагмент, а не самостоятельный Compose-файл: Rails-образ и подключение к PostgreSQL должны быть настроены так же, как у `app` выше.

```yaml
services:
  sidekiq:
    image: your-rails-app:latest
    command: bundle exec sidekiq -C config/sidekiq.yml
    deploy:
      replicas: 2
    environment:
      REDIS_URL: redis://redis:6379/1

  redis:
    image: redis:7
```

Если задания обращаются к БД, Sidekiq тоже нужны доступ к secret и настройка подключения к PostgreSQL. Rails-приложению, которое ставит задания в очередь, нужен адрес Redis. В таком виде у Redis не настроено постоянное хранение данных: перед использованием стека в production определите, допустима ли потеря очереди при сбое.

---

## 🧪 Как тестировать?

1. Локально проверяйте приложение с `docker compose`, но не считайте такой запуск проверкой поведения Swarm: правила `deploy` и сетевое взаимодействие могут отличаться.
2. Для проверки развёртывания стека в CI нужен доступный Docker-демон. На отдельном одноузловом окружении можно инициализировать Swarm и выполнить:

```bash
docker swarm init --advertise-addr 127.0.0.1
docker stack deploy -c docker-compose.ci.yml test_stack
```

Затем проверьте состояние задач через `docker service ps` и доступность приложения; сам `stack deploy` готовность не подтверждает. CI-файл должен учитывать, что в одноузловом окружении может не быть ноды с именем `db-node`.

3. Если используете `docker-compose.override.yml`, передавайте нужные файлы явно. `docker stack deploy` не подхватит override-файл автоматически.

---

## 🎤 Что сказать на собеседовании

> — Почему Swarm, а не Kubernetes?

— Для нашего стека Swarm покрывает текущие задачи с меньшей сложностью настройки. При этом отдельно решаем вопросы хранения данных, резервного копирования и работы приложения при сбоях; если требования изменятся, пересмотрим выбор оркестратора.

---

## 🧾 Вывод

Docker Swarm позволяет развернуть Rails и сопутствующие сервисы без Kubernetes. Но оркестрация контейнеров сама по себе не обеспечивает сохранность данных, готовность зависимостей и репликацию PostgreSQL. Эти задачи нужно учесть даже в небольшом стеке.