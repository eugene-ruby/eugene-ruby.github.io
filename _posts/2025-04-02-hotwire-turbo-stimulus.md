---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Hotwire, Turbo и Stimulus: frontend без JS-фреймворков (почти)'
date: '2024-09-20 12:00:00 +0300'
categories:
- frontend
- rails
tags: Ruby on Rails, Hotwire, Turbo, Stimulus, архитектура, JS, frontend, javascript
rate: 2
hero_image: "/images/posts/background_post-0073.webp"
---
Hotwire, Turbo и Stimulus — это современный подход к фронтенду в Rails-приложениях, который позволяет почти полностью отказаться от тяжелых JS-фреймворков. В статье разберём, как эти технологии работают вместе, какие проблемы решают и как интегрировать их в ваш проект без головной боли.

---
Вы только что закончили рефакторинг монолитного `application.js`, удалили 3000 строк jQuery-кода…  
А теперь клиент просит «интерактивности как в React».  
Не паникуйте — **Hotwire уже в пути**.

---

## � Почему не React/Vue/Angular?

Проблемы классических SPA-фреймворков в контексте Rails:

1. **Двойная разработка**: API (Rails) + фронтенд (React) = 2x кода.
2. **SEO-кошмары**: Hydration, SSR, мета-теги — отдельная боль.
3. **Сложность интеграции** с Turbolinks, UJS, формами Rails.

Hotwire предлагает **«тонкий клиент»**: сервер рендерит HTML, а JS лишь «оживляет» его.

---

## 🚀 Что такое Hotwire?

**Hotwire (HTML Over The Wire)** — это набор технологий для SPA-подобного UX без тонн JavaScript:

- **Turbo**: замена Turbolinks + динамические обновления DOM.
- **Stimulus**: минималистичный JS-фреймворк для реактивности.
- **Strada** (экспериментально): мобильные нативные компоненты.

Работает по принципу:  
**«Сервер рендерит HTML → JS подхватывает изменения»**.

---

## 🌀 Turbo: двигатель Hotwire

### Turbo Drive (бывший Turbolinks)
```ruby
# Вместо полной перезагрузки страницы:
# - AJAX-запрос за HTML
# - Замена <body>
# - Обновление URL
```
**Плюсы**: мгновенные переходы, меньше нагрузки на сервер.  
**Минусы**: нужно аккуратно с JS-инициализациями.

### Turbo Frames
```html
<!-- Частичное обновление блоков -->
<turbo-frame id="messages">
  <%= render @messages %>
</turbo-frame>

<!-- Ссылка обновит только этот фрейм -->
<%= link_to "Обновить", messages_path, data: { turbo_frame: "messages" } %>
```
**Идеально** для: фильтров, вкладок, лайв-поиска.

### Turbo Streams
```ruby
# В контроллере:
respond_to do |format|
  format.turbo_stream # Ищет шаблон `create.turbo_stream.erb`
end
```
Шаблон:
```erb
<!-- Добавляет новое сообщение в список -->
<%= turbo_stream.append "messages", @message %>

<!-- Варианты действий: append/prepend/replace/remove -->
```
**Это как ActionCable**, но без WebSocket-ов (если не нужно).

---

## 🎛 Stimulus: JS для ленивых

Когда Turbo не хватает — подключаем **Stimulus**:

```js
// app/javascript/controllers/search_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "results"]

  search() {
    fetch(`/search?q=${this.inputTarget.value}`)
      .then(response => response.text())
      .then(html => this.resultsTarget.innerHTML = html)
  }
}
```

Подключаем в HTML:
```html
<div data-controller="search">
  <input data-search-target="input" data-action="input->search#search">
  <div data-search-target="results"></div>
</div>
```

**Почему это лучше jQuery?**  
- Чёткая структура (контроллеры → действия → таргеты).  
- Автоматическая очистка при размонтировании.  
- Интеграция с Webpack/ESM.

---

## 🧩 Антипаттерны

### 1. «Турбо-ад» (Turbo Overuse)
```erb
<!-- Плохо: вложенные фреймы + streams + JS -->
<turbo-frame id="user">
  <turbo-frame id="posts">
    <!-- ... -->
  </turbo-frame>
</turbo-frame>
```
**Решение**: Используйте Turbo только там, где это упрощает UX.

### 2. «Стимьюлище» (Stimulus as React)
```js
// Плохо: тащите состояние в data-атрибуты
this.element.dataset.page = 2
```
**Решение**: Stimulus — для малых интерактивностей. Для сложного состояния — JSON API + Alpine.js.

### 3. Игнорирование прогрессивного улучшения
```ruby
# Плохо: форма не работает без JS
<%= form_with(model: @post, data: { turbo: false }) %>
```
**Решение**: Всегда делайте fallback на стандартное поведение.

---

## 🔧 Интеграция с Rails

### 1. Установка
```bash
bundle add hotwire-rails
rails hotwire:install
```
Это добавит:
- Turbo + Stimulus в `importmap.rb` (или Webpack).  
- Генераторы контроллеров Stimulus.  
- Шаблоны для `turbo_stream.erb`.

### 2. Работа с формами
```ruby
# Форма с обработкой Turbo Stream
<%= form_with(model: @post, format: :turbo_stream) %>
```
Сервер может ответить:
```erb
<%= turbo_stream.replace "post_#{@post.id}", @post %>
```

### 3. Кастомные события
```js
// Stimulus-контроллер может слушать Turbo-события:
this.element.addEventListener("turbo:submit-end", (event) => {
  if (event.detail.success) {
    this.showConfirmation()
  }
})
```

---

## 🧪 Тестирование

### Системные тесты с Turbo
```ruby
test "create post with Turbo Stream" do
  post posts_path, params: { post: { title: "New" } }, as: :turbo_stream

  assert_turbo_stream action: "append", target: "posts"
end
```

### Тесты Stimulus-контроллеров
```js
import { Application } from "@hotwired/stimulus"
import SearchController from "./search_controller"

describe("SearchController", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-controller="search">
        <input data-search-target="input">
        <div data-search-target="results"></div>
      </div>
    `
    const application = Application.start()
    application.register("search", SearchController)
  })

  it("updates results on input", () => {
    // ...
  })
})
```

---

## 🎤 Что сказать на собеседовании

> — Почему вы выбрали Hotwire вместо React?

— Для большинства CRUD-интерфейсов Hotwire даёт 90% UX SPA с 10% сложности. Мы экономим время на синхронизации состояний и получаем SEO «из коробки».

---

## 🧾 Вывод

**Hotwire — это «золотая середина» между MPA и SPA.**  
Turbo заменяет 80% jQuery-кода, Stimulus покрывает оставшиеся 19%, и только 1% — это повод тянуть React.  

Попробуйте на новом проекте — и ваши разработчики фронтенда перестанут просить «сборку на Webpack за 15 минут».  

**Когда Hotwire не подходит:**  
- Сложные клиентские состояния (например, Figma-подобный редактор).  
- Микросервисная архитектура с отдельным фронтендом.  

Для всего остального — есть Rails ♥️ Hotwire.  
