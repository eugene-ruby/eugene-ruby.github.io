---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: Катим pet в прод! — GitHub Actions легче, чем кажется
short_description: 'Как настроить деплой pet-проекта через GitHub Actions: собрать
  Docker-образ, отправить его в Docker Hub и обновить приложение на сервере по SSH.
  Разбираем настройку secrets и ограничения примера.'
date: '2024-09-23 12:00:00 +0300'
categories:
- devops
tags:
- CI/CD
- Deployment
- Secrets Management
rate: 2
hero_image: "/images/posts/background_post-0101.webp"
---
Вы уже сделали Dockerfile, настроили Docker Compose и разобрались с [Docker Hub](/posts/pet-docker-hub.html). Теперь можно автоматизировать деплой: при пуше в `main` GitHub Actions соберёт образ, отправит его в Docker Hub и запустит обновление на сервере по SSH.

---
Вы смотрите на свой pet-проект и думаете:  
«Всё готово, но каждый раз заливать изменения через `ssh` — это боль».  
Пора научить GitHub делать это за вас. **Автоматизируем!**

---

## 🧠 Теория: GitHub Actions за 5 минут

GitHub Actions — встроенный инструмент для автоматизации сборки, тестов и деплоя. Workflow описываются YAML-файлами в папке `.github/workflows/`.

Основные компоненты:
- **Jobs** — задачи (например, «собрать» и «задеплоить»).
- **Steps** — шаги внутри задачи: выполнение команды через `run` или использование готового действия через `uses`.
- **Actions** — готовые действия, например `appleboy/ssh-action` для выполнения команд по SSH.

---

## 🔧 Пример: деплой через SSH

Допустим, [у вас есть сервер с Docker](/posts/ubuntu-vps-docker.html). Хотите, чтобы при пуше в `main` GitHub:
1. Собрал образ.
2. Отправил его в Docker Hub.
3. Подключился по SSH и обновил приложение через Docker Compose.

В файле Compose у сервиса `app` должен быть указан тот же образ, который собирает workflow, например `image: yourname/yourapp:latest`. Замените `yourname/yourapp` на имя своего образа в обоих местах. На сервере также должен быть установлен Docker Compose и у SSH-пользователя должен быть доступ к Docker.

Вот как выглядит `.github/workflows/deploy.yml`:

{% raw %}
```yaml
name: Deploy to Production

on:
  push:
    branches: [ "main" ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Login to Docker Hub
        run: echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin

      - name: Build and push
        run: |
          docker build -t yourname/yourapp:latest .
          docker push yourname/yourapp:latest

      - name: SSH Deploy
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/your/app
            docker compose pull app
            docker compose up -d app
```
{% endraw %}

Замените `/path/to/your/app` на каталог с файлом Compose на сервере. Этот вариант предполагает, что образ доступен серверу без авторизации. Если репозиторий образа приватный, на сервере тоже потребуется доступ к Docker Hub: вход в реестр на GitHub runner его не авторизует.

> 🐌 Если `docker build` занимает десятки минут, посмотрите [оптимизацию Dockerfile](/posts/slow-fat-docker-image.html).

---

## 💡 Как это работает?

1. **Триггер**: при пуше в `main` запускается workflow.
2. **Сборка**: Docker-образ собирается и отправляется в Docker Hub.
3. **Деплой**: `ssh-action` выполняет команды на сервере. `docker compose pull app` загружает образ, указанный для сервиса `app`, а `docker compose up -d app` пересоздаёт контейнер, если образ изменился.

**Важно:** пароль Docker Hub, SSH-ключ и данные подключения задайте в secrets репозитория: `Settings → Secrets and variables → Actions`. В YAML используются имена `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SSH_HOST`, `SSH_USER` и `SSH_KEY`. Пример показывает деплой, но не запускает тесты: если они есть в проекте, добавьте отдельную job для тестов и настройте деплой так, чтобы он запускался только после её успешного завершения.

---

## 🧪 Тестируем workflow локально

Не хотите ждать коммитов? Для локального запуска job можно использовать [act](https://github.com/nektos/act):

```bash
act -j deploy
```

Для `act` нужен Docker, а secrets потребуется передать отдельно: они не появятся из настроек GitHub автоматически. Осторожнее с настоящими учётными данными: если передать их в `act`, job выполнит реальную отправку образа и SSH-деплой, а не безопасную имитацию.

---

## 🤑 А сколько стоит?

На 2024 год тариф GitHub Free включал **2 000 минут в месяц** для стандартных GitHub-hosted runners в приватных репозиториях. Для публичных репозиториев использование стандартных GitHub-hosted runners бесплатно. Условия и стоимость минут сверх лимита зависят от тарифа и типа runner, поэтому перед расчётом расходов проверьте актуальные настройки биллинга.

📊 Использование Actions можно посмотреть в [настройках биллинга GitHub](https://github.com/settings/billing).

> 💡 Можно использовать **self-hosted runner**: минуты GitHub-hosted runners тогда не расходуются, но сервер для runner нужно содержать самостоятельно.

## 🧐 А мне точно хватит Free тарифа?

Если ориентироваться на лимит 2 000 минут для приватного репозитория и один запуск на Linux runner занимает 10 минут, получится:

```text
2000 минут / 10 минут = 200 запусков в месяц
```

> 💡 Если запуск занимает 5 минут, при тех же условиях получится 400 запусков. Это пример расчёта, а не обещание такого времени сборки или деплоя.

---

## 🔥 Антипаттерны

{% raw %}

| Ошибка | Как исправить |
| --- | --- |
| Секреты записаны прямо в YAML | Храните их в GitHub Secrets и обращайтесь к ним через `${{ secrets.NAME }}` |
| Один огромный step на 100 строк | Разделяйте независимые операции на понятные шаги |
| Деплой без тестов | Если в проекте есть тесты, запускайте их до деплоя и останавливайте деплой при ошибке |

{% endraw %}

---

## 🎤 Что сказать на собеседовании

> — Как вы настраиваете CI/CD для pet-проектов?

— Использую GitHub Actions для сборки Docker-образа и деплоя по SSH. Например, `appleboy/ssh-action` позволяет запустить обновление контейнера на сервере. Если в проекте есть тесты, выполняю их перед деплоем.

---

## 🧾 Вывод

GitHub Actions позволяет убрать ручное обновление приложения: пуш в `main` запускает сборку образа и деплой. Перед тем как полагаться на такую схему, проверьте соответствие имени образа в workflow и Compose, доступ сервера к реестру и хранение учётных данных в secrets.

🤓 Хотите улучшить workflow? Следующий шаг — [выкатка релизов через git tag](/posts/github-tag-pet-deploy.html).