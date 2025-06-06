---
layout: post
title: "BASE vs ACID — философия данных под разными углами"
date: 2025-06-03 11:00:00 +0300
categories:
  - database
  - architecture
toc: true
menubar_toc: true
hero_image: /images/architecture.jpeg
hero_darken: true
---

Если ты привык к PostgreSQL и ACID, то чтение документации MongoDB вызывает культурный шок. Что значит *eventual consistency*? Почему не rollback?

---

## 🧪 ACID (PostgreSQL стиль)

- **A**tomicity — всё или ничего
- **C**onsistency — состояние БД всегда валидно
- **I**solation — транзакции не мешают друг другу
- **D**urability — коммит не теряется

👉 Отлично подходит для банков, бухгалтерии, всех систем, где данные = деньги.

---

## 🧊 BASE (NoSQL стиль)

- **B**asically Available
- **S**oft state
- **E**ventual consistency

👉 Звучит как "всё будет нормально... когда-нибудь". Хорошо работает для больших распределённых систем, где скорость и масштаб важнее точности.

---

## 🤔 Почему это важно?

- ACID = безопасно, но может тормозить
- BASE = быстро, но ты сам решаешь, как восстанавливать правду

Если ты строишь распределённую систему — ты _уже выбираешь_ сторону.

---
