---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Vendoring гемов: когда твой CI не любит интернет'
date: '2024-09-18 12:00:00 +0300'
categories:
- devops
- ruby
tags: Ruby,gems,vendoring,CI,dependencies,network errors
rate: 3
hero_image: "/images/posts/background_post-0078.webp"
---
Вы знаете этот момент, когда CI падает с ошибкой `Network error: Failed to download gem 'some-gem-42.0'`, а дедлайн — вчера?  
Поздравляю: вы только что встретили **главную боль distributed-систем — зависимость от интернета**.  

В этой статье разберём, как **vendoring гемов** спасает от хаоса, когда:  
- GitHub лежит,  
- RubyGems тормозит,  
- а ваш релиз должен уйти **прямо сейчас**.

---

## � Почему «просто bundle install» — это русская рулетка

Типичный сценарий:  

```bash
bundle install
# ... через 5 минут ...
Gem::RemoteFetcher::FetchError: bad response Not Found 404
```

**Проблемы, которые убивают ваш CI/CD:**  
1. **Хрупкость**: внешние репозитории могут быть недоступны.  
2. **Неожиданные изменения**: `bundle update` может принести сюрпризы (особенно с `~>` и `>=`).  
3. **Скорость**: загрузка сотен мегабайт гемов при каждом билде.  

> «Но у нас же кеш!» — скажете вы.  
> А теперь представьте **новый сервер, контейнер или emergency-развёртывание**.

---

## 🧰 Что такое vendoring гемов?

**Vendoring** — это практика включения **всех зависимостей прямо в репозиторий проекта**.  
Вместо:  

```
Gemfile
Gemfile.lock
```

Вы получаете:  

```
Gemfile
Gemfile.lock
vendor/cache/ # ← все .gem файлы тут
```

### Как это работает?

1. **Локальное хранилище**: гемы скачиваются один раз и кладутся в `vendor/cache`.  
2. **Оффлайн-установка**: `bundle install --local` использует только локальные файлы.  
3. **Гарантия версий**: никаких неожиданностей при деплое.  

---

## 🔧 Практика: как завести vendoring в проекте

### Шаг 1. Инициализация

```bash
bundle package --all
```

Флаг `--all` включает даже гемы из optional-групп (типа `:development`).  

Теперь в `vendor/cache` лежат **все .gem-файлы**, а также их checksums.  

### Шаг 2. CI/CD без интернета

Добавляем в ваш скрипт деплоя:  

```bash
bundle install --local || exit 1
```

Если гемов нет в кеше — билд **падает**, а не лезет в сеть.  

### Шаг 3. Обновление гемов

Когда нужно обновить зависимости:  

```bash
bundle update some-gem
bundle package --all
git add vendor/cache
git commit -m "Update some-gem to v42.0"
```

---

## 💣 Антипаттерны

### 1. «Vendor’им только production-гемы»  

```bash
bundle package --no-install
```

Проблема: **на CI упадут тесты**, потому что `rspec` или `rubocop` не скачаны.  

### 2. «Добавим vendor/cache в .dockerignore»  

Теперь ваш образ **снова зависит от сети**.  

### 3. «Зачем это, если есть Docker layer caching?»  

А теперь соберите образ **на новом сервере**.  

---

## 🏗️ Интеграция с Rails и PostgreSQL

### Пример для Dockerfile

```dockerfile
COPY Gemfile Gemfile.lock ./
COPY vendor/cache /vendor/cache
RUN bundle install --local
```

### Для проектов с нативными расширениями

Некоторые гемы (например, `pg` для PostgreSQL) требуют **компиляции**.  

Решение:  

```bash
bundle config set force_ruby_platform true
bundle package --all
```

Теперь в `vendor/cache` попадёт **чистая Ruby-версия** гема.  

---

## 🧪 Тестируем vendoring

Проверьте, что всё работает **без интернета**:  

```bash
rm -rf ~/.bundle/cache
bundle install --local
```

Если падает — значит, **какие-то гемы пропущены**.  

---

## 🎤 Что сказать на собеседовании

> — Как вы обеспечиваете стабильность деплоев?  

— Мы используем vendoring гемов, чтобы CI и production-развёртывания **не зависели от внешних сервисов**. Это даёт:  
- **предсказуемость** (те же версии гемов),  
- **скорость** (не качаем одни и те же .gem-файлы),  
- **надёжность** (работает даже при отключённом интернете).  

---

## 🧾 Вывод

**Vendoring — это как носить с собой аптечку вместо надежды на ближайшую больницу.**  
- ✅ Больше никаких `bundle install` с молитвой.  
- ✅ Контроль версий **на 100%**.  
- ✅ Деплой **даже в оффлайне**.  

Цена? **Лишние мегабайты в репозитории**.  
Но если ваш CI уже падал из-за `rubygems.org` — вы знаете, что делать.  

```bash
git add vendor/cache
git commit -m "Make CI great again"
```