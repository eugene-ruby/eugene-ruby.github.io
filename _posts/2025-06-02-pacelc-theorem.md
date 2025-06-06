---
layout: post
title: "PACELC — CAP с дополнением: а что, если сети нет?"
date: 2025-06-02 10:00:00 +0300
categories:
  - architecture
  - database
toc: true
menubar_toc: true
hero_image: /images/architecture.jpeg
hero_darken: true
---

Все обсуждают CAP, но редко говорят о PACELC. А зря. Если CAP — это про сбои, то PACELC добавляет: **а что, если всё хорошо?**

---

## 🤯 Что такое PACELC?

> Если происходит разделение сети (P), то система должна выбрать между доступностью (A) и консистентностью (C),  
> **а в остальное время (E)** — между латентностью (L) и консистентностью (C).

### Расшифровка:
**PACELC** = *Partition / Availability / Consistency / Else / Latency / Consistency*

---

## 🔄 Пример с PostgreSQL

- Во время сетевого сбоя (P):
    - **Patroni** делает failover: ты выбираешь между A и C
- В остальное время (E):
    - Репликация задерживает коммит (sync-реплика): ты выбираешь между L и C

---

## 📌 Вывод

CAP — это про сбои. PACELC — про **всю картину**: и когда падает, и когда работает. Если ты строишь HA — думать в терминах PACELC важно.

---
