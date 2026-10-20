---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Gemspec и Bundler: как устроены гемы'
date: '2024-09-18 12:00:00 +0300'
categories:
- tools
- ruby
tags: Ruby,гемы,Bundler,зависимости,gemspec,production
rate: 3
hero_image: "/images/posts/background_post-0040.webp"
---
Вы когда-нибудь задумывались, почему `bundle install` иногда работает как швейцарские часы, а иногда — как советский трактор в -30°C? Сегодня разберёмся, как устроены Ruby-гемы изнутри, почему ваш `gemspec` внезапно сломал production, и как Bundler решает головоломку зависимостей.

---

## 🧩 Что такое RubyGem?

**RubyGem** — это упакованный кусок кода, который можно:  
✅ Подключить в проект одной строчкой  
✅ Версионировать  
✅ Распространять через [rubygems.org](https://rubygems.org)  

Гемом может быть что угодно: от утилиты для генерации QR-кодов до целого фреймворка вроде Rails.  

Но под капотом — это просто **архив с кодом + метаданные**.  

---

## 📦 Анатомия гема

Стандартная структура после `bundle gem my_gem`:  

```
my_gem/
├── lib/
│   ├── my_gem.rb         # Главный файл
│   └── my_gem/           # Доп. модули
├── spec/                 # Тесты
├── Gemfile               # Зависимости для разработки
├── my_gem.gemspec        # Метаданные гема
└── README.md             # Документация
```

**Сердце гема** — `.gemspec`. Без него ваш код останется просто папкой на GitHub.

---

## 🔧 Gemspec: инструкция по сборке

Пример минимального `my_gem.gemspec`:  

```ruby
Gem::Specification.new do |s|
  s.name        = "my_gem"
  s.version     = "0.1.0"
  s.summary     = "Делает магию"
  s.authors     = ["Вася Пупкин"]
  s.files       = Dir["lib/**/*.rb"] # Важно! Иначе код не попадёт в гем
  s.license     = "MIT"
end
```

### Частые ошибки:  
1. **Забыли `s.files`** → гем установится, но код не загрузится  
2. **Жёстко зафиксировали зависимости** (`s.add_dependency "rails", "7.0.8"`) → конфликты в большом проекете  
3. **Не указали `s.required_ruby_version`** → гем сломается на старых Ruby  

---

## 🧠 Bundler: дирижёр зависимостей

Bundler решает **NP-полную задачу** (да, серьёзно!) — подбирает версии гемов так, чтобы:  

1. Все зависимости были удовлетворены  
2. Не было конфликтов  
3. Использовались максимально свежие версии  

Когда `bundle install` работает 5 минут — он перебирает тысячи комбинаций.  

---

## 💀 Реальные боли  

### 1. **Волосатый граф зависимостей**  

```bash
Bundler could not find compatible versions for gem "railties":
  In Gemfile:
    rails (~> 7.0) was resolved to 7.0.8, which depends on
      railties (= 7.0.8)

    devise was resolved to 4.9.3, which depends on
      railties (>= 6.1.0)
```

**Решение:**  
- Используйте `bundle update --conservative devise`  
- Или явно укажите версию в `Gemfile`: `gem "devise", "~> 4.9"`  

### 2. **Гем-призрак**  

После удаления гема из `Gemfile` он остаётся в `Gemfile.lock`.  

**Фикс:**  
```bash
bundle clean --force
```

### 3. **Локальная разработка**  

Хотите тестировать гем прямо в своём проекете?  

```ruby
# Gemfile
gem "my_gem", path: "../my_gem"
```

---

## 🛠️ Антипаттерны  

1. **Гем-монстр**  
   - 50 зависимостей  
   - 10 MB кода  
   - А нужен только один метод  

   → Разбивайте на мелкие гемы!  

2. **Динамический `gemspec`**  

   ```ruby
   s.version = `git describe --tags`.strip # А если git нет в production?
   ```

3. **Игнорирование `Gemfile.lock` в геме**  
   - Храните его в git!  
   - Иначе сборка может сломаться в любой момент.  

---

## 🎓 Продвинутые трюки  

### 1. Условные зависимости  

```ruby
# gemspec
s.add_development_dependency "sqlite3" # Для тестов
if RUBY_VERSION >= "3.1"
  s.add_dependency "psych", ">= 4.0"
end
```

### 2. Скрываем ненужные файлы  

```ruby
s.files -= Dir["test/**/*"] # Не включаем тесты в релиз
```

### 3. Собственные источники гемов  

```ruby
# Gemfile
source "https://gems.my-company.com" do
  gem "internal_gem"
end
```

---

## 🧪 Тестируем гем правильно  

1. Используйте `appraisal` для тестов с разными версиями зависимостей:  

```ruby
# Appraisals
appraise "rails-7" do
  gem "rails", "~> 7.0"
end
```

2. Автоматизируйте релиз с `gem-release`:  

```bash
gem bump -v minor && gem release
```

---

## 🏁 Вывод  

1. **Gemspec** — это паспорт гема. Без него ваш код не попадёт в rubygems.org.  
2. **Bundler** — сложный, но умный. Не ругайте его за медлительность — он решает задачу уровня "собрать кубик Рубика вслепую".  
3. **Локальная разработка** гемов требует аккуратности. Тестируйте в условиях, близких к production.  

P.S. Если `bundle install` снова завис — попробуйте сначала выпить кофе. Иногда помогает. ☕  
