---
layout: post
subtitle: <div id="terminal"></div>
title:  "Rubygems, Gemfile.lock и версия, которая всё сломала"
rate: 3
tags: Ruby, bundle update, Gemfile.lock, зависимости, ошибки, Rubygems
version: 3.2.2
date:   2024-09-18 12:00:00 +0300
categories:
  - gems
  - ruby
hero_image: /images/posts/33.jpg
hero_darken: true
toc: true
menubar_toc: true
---

Вы только что сделали `bundle update`, и теперь ваше приложение ведёт себя так, будто его писали на PHP после трёх бутылок виски. Всё сломано, тесты горят, а в логах — ошибки, которых вы никогда не видели. Добро пожаловать в ад зависимостей, где `Gemfile.lock` — ваш единственный спаситель, а Rubygems — коварный тролль, подкладывающий грабли.

---

## 🧠 Теория: как работают гемы в Ruby

**Rubygems** — это система управления пакетами для Ruby.  
**Bundler** — менеджер зависимостей, который:
1. Читает `Gemfile` ("мне нужны эти гемы примерно в таких версиях").
2. Генерирует `Gemfile.lock` ("вот точные версии, которые работают вместе").
3. Заставляет всех играть по правилам.

Проблема в том, что **"примерно"** — очень растяжимое понятие.

---

## 💣 Реальный кейс: когда `~>` кусается

Допустим, у вас в `Gemfile`:
```ruby
gem "rails", "~> 7.0.0"
```
Вы думаете: "Это же patch-версии, ничего не сломается!".  
А потом выходит Rails 7.0.4, где:
- Переименовали `#pluck` в `#pluck_all` (потому что "так лучше").
- Добавили валидацию, которая считает ваш легаси-код невалидным.
- `ActiveRecord` теперь требует PostgreSQL 15+ (а у вас на продакшене 13).

И вот вы уже не спите ночью, вспоминая, зачем вообще занялись программированием.

---

## 🔧 Практика: как `Gemfile.lock` спасает (и предаёт)

**Хороший `Gemfile.lock`**:
```ruby
rails (7.0.3.1)
  actioncable (= 7.0.3.1)
  actionmailer (= 7.0.3.1)
  # ... все зависимости зафиксированы
```
Это гарантия, что на всех окружениях — одинаковые версии.

**Плохой сценарий**:
1. Вы удалили `Gemfile.lock` "для чистоты".
2. Сделали `bundle install` на продакшене.
3. Получили Rails 7.1.0 с breaking changes.
4. Продакшен упал в 9 утра понедельника.

---

## 💀 Антипаттерны

1. **"Обновлять всё подряд"**  
   ```bash
   bundle update --all # эквивалент игры в русскую рулетку
   ```
2. **"Закомичу `Gemfile.lock` потом"**  
   (Спойлер: вы забудете, и коллега сломает CI).
3. **"У меня же указана точная версия!"**  
   ```ruby
   gem "pg", "1.5.3" # а его зависимости? они могут притащить ад
   ```

---

## 🛡️ Как обновляться без боли

1. **Локально**:
   ```bash
   bundle update gem_name --conservative
   ```
2. **Проверяйте `CHANGELOG.md`** (если его нет — бегите от этого гема).
3. **Тестируйте на staging** перед деплоем.
4. **Используйте `bundle outdated`** для аудита:
   ```bash
   $ bundle outdated
   * rails (7.0.3.1 < 7.1.0) # красный флаг!
   ```

---

## 🧪 Тест на зрелость

> — Что делает эта команда?
> ```bash
> rm Gemfile.lock && bundle install
> ```

— Либо вы только что сломали проект, либо ваш `Gemfile` настолько строгий, что вы — йог зависимостей.

---

## 🧾 Вывод

1. **`Gemfile.lock` — священен**. Не удаляйте его, не игнорируйте в git.
2. **Обновляйтесь осознанно**. `~>` — не "примерно", а "я готов к сюрпризам".
3. **SemVer — это миф**. Всегда читайте список изменений.
