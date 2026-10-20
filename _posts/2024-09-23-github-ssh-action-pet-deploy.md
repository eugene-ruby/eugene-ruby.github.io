---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: Катим pet в прод! — GitHub Actions это легче чем кажется
date: '2024-09-23 12:00:00 +0300'
categories:
- pet
- devops
tags: GitHub Actions, CI/CD, Docker, SSH, DevOps
rate: 2
hero_image: "/images/posts/background_post-0101.webp"
---
Вы уже сделали Dockerfile, настроили docker-compose и даже разобрались с [DockerHub](/posts/pet-docker-hub.html). Теперь пришло время автоматизировать деплой — и GitHub Actions сделает это за вас буквально в несколько строк конфига. В статье разберём, как настроить CI/CD с SSH-деплоем через `appleboy/ssh-action`, избегая типичных ошибок новичков.

---
Вы смотрите на свой pet-проект и думаете:  
«Всё готово, но каждый раз заливать изменения через `ssh` — это боль».  
Пора научить GitHub делать это за вас. **Автоматизируем!**

---

## 🧠 Теория: GitHub Actions за 5 минут

GitHub Actions — это встроенный инструмент для **автоматизации workflows** (сборки, тестов, деплоя).  
Работает на основе YAML-файлов в папке `.github/workflows/`.

Основные компоненты:
- **Jobs** — задачи (например, «собрать» и «задеплоить»).
- **Steps** — шаги внутри задачи (`checkout`, `run`, `uses`).
- **Actions** — готовые модули (например, `appleboy/ssh-action` для подключения по SSH).

---

## 🔧 Пример: деплой через SSH

Допустим, [у вас есть сервер с Docker](/posts/ubuntu-vps-docker.html).
Хотите, чтобы при пуше в `main` GitHub:
1. Собрал образ.
2. Залил его в Docker Hub.
3. Подключился по SSH и запустил `docker-compose up`.

Вот как это выглядит в `.github/workflows/deploy.yml`:

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
            docker pull yourname/yourapp:latest
            cd /path/to/your/app
            docker-compose up -d
```
{% endraw %}

> 🐌 Если `docker build` занимает десятки минут? ⌛ [Оптимизация Dockerfile](/posts/slow-fat-docker-image.html)

---

## 💡 Как это работает?

1. **Триггер**: при пуше в `main` запускается workflow.
2. **Сборка**: Docker-образ пакуется и отправляется в Hub.
3. **Деплой**: через `ssh-action` подключаемся к серверу и обновляем контейнеры.

**Важно**: Все чувствительные данные (пароли, SSH-ключи) хранятся в Secrets репозитория (`Settings → Secrets`).

---

## 🧪 Тестируем workflow локально

Не хотите ждать коммитов? Используйте [act](https://github.com/nektos/act):

```bash
act -j deploy
```

Это запустит job `deploy` локально — удобно для отладки.

---

## 🤑 А сколько стоит?

На 2024 год GitHub предоставляет **2 000 бесплатных минут GitHub Actions в месяц** для публичных и большинства частных репозиториев, что эквивалентно скидке примерно **\$16**. 

Это покрывает базовые CI/CD-потребности pet-проектов и небольших команд. При превышении лимита начисляется плата — **\$0.008 за минуту** (или \~\$0.48/час).

📊 Текущий расход и остаток минут можно посмотреть здесь:
👉 [github.com/settings/billing](https://github.com/settings/billing) → раздел **Actions usage**

> 💡 Бонус: Можно использовать **self-hosted runner**, минуты не списываются — только плата за свой сервер.

## 🧐 А мне точно хватит Free тарифа?

Если один деплой в GitHub Actions занимает даже 10 минут, то:

```text
2000 минут / 10 минут = 200 деплоев в месяц
```
> 💡 Если деплой занимает меньше (например, 5 минут), лимит хватит уже на 400 прогонов.

Можно push-шить свой pet-проект десятки раз в день 🌚🌝

---

## 🔥 Антипаттерны

{% raw %}

| Ошибка                          | Как исправить                     |
| ------------------------------- | --------------------------------- |
| Жёстко зашитые секреты в YAML   | Используйте `${{ secrets.NAME }}` |
| Один огромный step на 100 строк | Разбивайте на логические блоки    |
| Деплой без тестов               | Добавьте stage `test` перед deploy|

{% endraw %}

---

## 🎤 Что сказать на собеседовании

> — Как вы настраиваете CI/CD для пет-проектов?

— Использую GitHub Actions с Docker + SSH-деплоем. Например, через `appleboy/ssh-action` для быстрого обновления сервера. Это дешевле, чем настраивать полноценный Kubernetes для мелких задач.

---

## 🧾 Вывод

**GitHub Actions — это как автоответчик для вашего кода.**  
Настроили один раз — и забыли про ручной деплой. Теперь ваш pet-проект живёт по принципу «запушил → получил продакшн». И да, это заняло всего 20 строк YAML. 🚀

🤓 Интересно как улучшить ci.yml? Уровень со звездочкой 🌟 [Выкатка релизов через git tag](/posts/github-tag-pet-deploy.html)
