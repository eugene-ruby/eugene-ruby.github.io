---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Мой первый Pet + VPS: Оплатил сервер, есть SSH — а что дальше? Лайт-гайд по
  Ubuntu для Docker'
date: '2024-09-18 12:00:00 +0300'
categories:
- pet
- devops
tags: Ubuntu, Docker, VPS, pet
rate: 1
hero_image: "/images/posts/background_post-0006.webp"
---
Вы только что получили доступ к своему первому VPS на Ubuntu 24.04 — и теперь смотрите на чёрный экран терминала с чувством, будто открыли дверь в космический корабль. Не волнуйтесь! В этой статье мы разберём, как превратить голый Ubuntu-сервер в готовую площадку для запуска Docker-контейнеров с Ruby on Rails и PostgreSQL.

---

## 🚀 Шаг 1: Первые команды после входа

Подключитесь к серверу через SSH:
```bash
ssh root@ваш_ip
```

**Что сразу сделать:**

1. **Обновить пакеты** (чтобы избежать "у меня на локале работало!"):
   ```bash
   apt update && apt upgrade -y
   ```

2. **Создать пользователя** (работать от root — как резать хлеб бензопилой):
   ```bash
   adduser deploy
   usermod -aG sudo deploy  # Даём права sudo
   ```
---

## 🐳 Шаг 2: Установка Docker и Docker Compose

**Для Ubuntu 24.04**:
```bash
# Устанавливаем Docker
apt install -y docker.io

# Добавляем пользователя в группу docker
usermod -aG docker deploy

# Устанавливаем Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

Проверяем:
```bash
docker --version
docker-compose --version
```

---

## 🛠️ Шаг 3: Лайт-Оптимизация для Docker

1. **Лимиты для контейнеров** (чтобы один контейнер не сожрал все ресурсы):
   ```bash
   nano /etc/docker/daemon.json
   ```
   Добавляем:

   ```json
   {
     "default-ulimits": {
       "nofile": {
         "Name": "nofile",
         "Hard": 65536,
         "Soft": 65536
       }
     },
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "10m",
       "max-file": "3"
     }
   }
   ```

🧠 **Что здесь происходит:**

* `nofile` — ограничение на число открытых файлов (65536).
  🔒 Предотвращает утечку дескрипторов, ошибки `EMFILE`, обвалы из-за переполнения сокетов или логов.

* `log-driver: json-file` — стандартный драйвер логов Docker.

* `max-size: 10m` — каждый log-файл максимум 10 мегабайт.

* `max-file: 3` — хранятся 3 файла: активный + 2 старых.

🧯 **Зачем:**
Ограничивает рост логов, чтобы контейнер не забил весь диск `/var/lib/docker/containers/…/container.log`.

📌 После изменения файла перезапускаем:
   
```bash
   systemctl restart docker
   ```
---

---

## 🌐 Опционально: NGINX как точка входа + HTTPS

Если для вашего приложения требуется интерфейс HTTP/HTTPS

Устанавливаем:

```bash
apt install nginx -y
```

Базовый конфиг (внутренний 3000 HTTP порт вашего приложения):

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Активируем:

```bash
ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

### 🔐 Let's Encrypt + Certbot (HTTPS за 1 минуту)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d example.com
```

> 🔁 Автоматическое обновление сертификатов уже настроено cron-ом!


## 🔐 Бонус: Усиление безопасности сервера

> ⚠️ Если не понимаете что дальше и это ваш первый сервер, то лучше не делайте

### 🚪 Защита SSH: новый порт и ключи вместо пароля

1. Измените порт SSH (например, на 2222) и отключите вход по паролю:
   ```bash
   nano /etc/ssh/sshd_config
   ```

Замените:

```
Port 2222
PasswordAuthentication no
PermitRootLogin no
```

2. Добавьте публичный ключ в `~/.ssh/authorized_keys`.

3. Перезапустите SSH:

   ```bash
   systemctl restart sshd
   ```

> 💡 Не закрывайте текущую сессию — сначала убедитесь, что новый порт работает!

---

### 🔥 Базовая защита через UFW (фаервол)

```bash
ufw allow 2222/tcp     # SSH (новый порт)
ufw allow 80,443/tcp   # HTTP/HTTPS
ufw enable             # Включаем фаервол
ufw status verbose     # Проверка
```

> ❗ Совет: открой только нужные порты. Нельзя попасть на сервер = нельзя его спасти.

---

### 🛡️ Fail2Ban — баним брутфорсеров

```bash
apt install fail2ban -y
systemctl enable fail2ban --now
```

Это добавит автоматический бан IP-адресов при подозрительной активности.

## 💡 Антипаттерны новичков

1. **Работа от root**  
   *Проблема*: Одна ошибка — и сервер превращается в "кирпич".  
   *Решение*: Всегда используйте отдельного пользователя с sudo.
2. **Docker без лимитов**  
   *Проблема*: Контейнер с утечкой памяти парализует сервер.  
   *Решение*: `--memory=512m` в `docker run`.

---
 
## 🎯 Вывод

* Docker с базовой защитой и лог-лимитами
* Защищённый SSH и брандмауэр
* NGINX как точка входа с HTTPS
* Опции для fail2ban