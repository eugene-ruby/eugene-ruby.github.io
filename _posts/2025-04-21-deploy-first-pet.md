---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Деплой приложения: от ручной выкатки до автоматического CI/CD'
date: '2025-04-21 14:00:00 +0300'
categories:
- pet
- docker
tags: Docker CI/CD Pet Python
rate: 1
hero_image: "/images/posts/background_post-0059.webp"
---
Деплой приложения — это как первый полёт на самолёте, который вы собрали в гараже: страшно, но если всё сделано правильно — невероятно приятно. В статье разберём, как перейти от ручных выкаток к автоматизированному CI/CD даже для pet-проектов, и почему это стоит сделать сразу, а не "когда-нибудь потом".

---

## 🧠 Что такое деплой и зачем он нужен?

Деплой (от англ. *deploy* — развёртывание) — это процесс переноса вашего кода с локальной машины на сервер, где его смогут использовать реальные пользователи.

**Почему это больно без автоматизации:**
- Вручную копируете файлы по FTP → забыли `requirements.txt`
- Запускаете скрипты вручную → упали миграции
- Не проверили код перед выкаткой → продакшн упал в 3 часа ночи

---

## 🚀 Простейший Flask-пример

Наше тестовое приложение (`app.py`):

{% raw %}
```python
from flask import Flask, request, render_template_string

app = Flask(__name__)

HTML = '''
<form method="POST">
  <input name="text" placeholder="Введите текст">
  <button type="submit">Отправить</button>
</form>
{% if text %}
  <p>Вы отправили текст: {{ text }}</p>
{% endif %}
'''

@app.route('/', methods=['GET', 'POST'])
def index():
    text = request.form.get('text')
    return render_template_string(HTML, text=text)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

`requirements.txt`:
```
Flask==3.0.0
```
{% endraw %}

---

## 🐳 Упаковываем в Docker

**Dockerfile** — инструкция по сборке образа:

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "app.py"]
```

**docker-compose.yml** для удобного запуска:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "5000:5000"
    restart: unless-stopped
```

Теперь можно запустить одним командой:
```bash
docker-compose up -d
```

---

## 🔥 Почему CI/CD нужен даже для pet-проекта

1. **Вы учитесь на production-grade практиках**  
   Хотите в резюме "опыт с CI/CD"? Начните сейчас.

2. **Экономия времени**  
   Ручной деплой 5-минутного изменения займёт 15 минут.

3. **Автоматическая проверка кода**  
   Тесты запустятся сами перед выкаткой.

4. **Легко масштабировать**  
   Завтра ваш pet-проект может стать стартапом.

---

## ⚙️ Настраиваем CI/CD через GitHub Actions

`.github/workflows/deploy.yml`:

{% raw %}
```yaml
name: Deploy to server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: |
          docker-compose build
          
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/project
            git pull
            docker-compose down
            docker-compose up -d --build
```
{% endraw %}

**Где взять секреты?**  
В настройках репозитория: Settings → Secrets → New repository secret.

---

## 💀 Антипаттерны деплоя

1. **"Сначала сделаю, потом настрою"**  
   Результат: 50 правок и "как это всё теперь собрать?".

2. **Ручные миграции БД**  
   Забыли применить — получили 500 ошибки.

3. **"Работает на моей машине"**  
   Без Docker окружение будет отличаться.

4. **Деплой в пятницу вечером**  
   Спойлер: выходные будут испорчены.

---

## 🎤 Что сказать на собеседовании

> — Как вы организуете деплой?

— Для pet-проектов использую Docker + GitHub Actions. Настраиваю CI/CD сразу, чтобы автоматизировать тесты и выкатку. Для продакшена добавляю этапы blue-green деплоя.

---

## 🧾 Вывод

**Автоматизация деплоя — это не роскошь, а гигиена разработки.**  
Потратьте 2 часа сегодня, чтобы не терять дни на "а почему оно не работает?" завтра. Ваш будущий я, который в 3 часа ночи чинит продакшн, скажет вам спасибо.
