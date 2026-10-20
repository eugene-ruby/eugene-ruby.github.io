---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
hero_darken: true
toc: true
menubar_toc: true
title: 'Helm с нуля: чарты, values и деплой как у больших'
date: '2024-03-24 12:00:00 +0300'
categories:
- devops
- architecture
tags: Kubernetes, Helm, DevOps, Deployment, CI/CD
rate: 4
hero_image: "/images/posts/background_post-0065.webp"
---
Helm — это не просто менеджер пакетов для Kubernetes, а полноценный инструмент оркестрации, который превращает ваш `kubectl apply -f` в осмысленный процесс управления конфигурациями. В статье разберём, как создавать чарты, работать с values.yaml и деплоить приложения без головной боли, как это делают в production-средах.

---
Вы только что написали `kubectl apply -f deployment.yaml` в третий раз за час, потому что забыли изменить реплики или версию образа.  
Поздравляю, вы готовы к Helm!

---

## 🧠 Теория: что такое Helm?

Helm — это **пакетный менеджер для Kubernetes**, который:
- Упаковывает манифесты в **чарты** (аналогично `.deb`/`.rpm`).
- Позволяет параметризировать конфиги через **values.yaml**.
- Управляет версиями через **релизы** (releases).

По сути, это `Bundler` для вашего Kubernetes.

---

## 🔧 Первый чарт: от `helm create` до деплоя

Создаём скелет чарта:

```bash
helm create my-rails-app
```

Структура получится такой:

```
my-rails-app/
├── charts/          # Зависимости
├── Chart.yaml       # Метаданные (как Gemfile)
├── templates/       # Шаблоны манифестов
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ...
└── values.yaml      # Дефолтные параметры
```

---

## 💡 Как работает values.yaml?

Это **центральный конфиг** для переопределения параметров. Пример:

```yaml
# values.yaml
replicaCount: 3
image:
  repository: myregistry/rails-app
  tag: latest
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 3000
```

А в шаблоне (`templates/deployment.yaml`) используем так:

{% raw %}
```yaml
spec:
  replicas: {{ .Values.replicaCount }}
  containers:
    - image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```
{% endraw %}

---

## 🚀 Деплой: 3 способа

1. **Локальный тест** (проверка шаблонов):
   ```bash
   helm install --dry-run --debug my-release ./my-raws-app
   ```

2. **Продакшн-деплой**:
   ```bash
   helm upgrade --install my-release ./my-rails-app \
     --set image.tag="v1.2.3" \
     --set replicaCount=5
   ```

3. **Через CI/CD** (например, GitLab):
   ```yaml
   deploy:
     script:
       - helm upgrade --install $CI_PROJECT_NAME ./chart \
           --set image.tag=$CI_COMMIT_SHA
   ```

---

## 🧪 Тестирование: от линтеров до интеграции

1. **Проверка синтаксиса**:
   ```bash
   helm lint ./my-rails-app
   ```

2. **Unit-тесты** (используем `helm-unittest`):

   ```yaml
   # tests/deployment_test.yaml
   suite: test deployment
   templates:
     - deployment.yaml
   tests:
     - it: should have 3 replicas
       set:
         replicaCount: 3
       asserts:
         - equal:
             path: spec.replicas
             value: 3
   ```

---

## 🔥 Антипаттерны

{% raw %}

| Ошибка                          | Последствия                     | Решение                                                |
|---------------------------------|---------------------------------|--------------------------------------------------------|
| Один гигантский values.yaml     | Нечитаемость, конфликты         | Разделять на env-файлы                                 |
| Жёсткие теги (`tag: latest`)    | Непредсказуемость деплоя        | Использовать `tag: {{ .Chart.AppVersion }}` |
| 100500 зависимостей в requirements.yaml | Сложность обновлений | Проверять `helm dependency update`                     |


{% endraw %}
---

## 🎤 Что сказать на собеседовании

> — Как вы управляете конфигами для разных окружений?

— Мы используем Helm с многослойными values:  
`values.yaml` (база) → `values-prod.yaml` (переопределения) → `--set` (экстренные правки).  
Плюс `helmfile` для сложных сценариев.

---

## 🧾 Вывод

**Helm — это ваш "kubectl на стероидах".**  
Он превращает рутину в декларативный процесс, где:
- Конфиги версионируются вместе с кодом.
- Деплой становится предсказуемым.
- А вы наконец-то перестаёте путаться, какой `yaml` куда применить.

Теперь можно деплоить без молитв и кофе-брейков в 3 часа ночи.
