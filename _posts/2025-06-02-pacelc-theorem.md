---
layout: post
subtitle: <div id="terminal"></div>
title: "PACELC — CAP с дополнением: а что, если сети нет?"
date: 2025-06-02 10:00:00 +0300
rate: 3
tags: CAP-теорема,PACELC,распределённые системы,PostgreSQL,репликация,консистентность
version: 3.2.2
categories:
  - database
  - architecture
toc: true
menubar_toc: true
hero_image: /images/posts/94.jpg
hero_darken: true
---
В мире распределённых систем CAP-теорема давно стала классикой, но её расширение PACELC часто остаётся в тени. В то время как CAP фокусируется на поведении системы при сбоях, PACELC добавляет критически важный аспект — компромиссы между латентностью и консистентностью в штатном режиме работы. Особенно актуально это для PostgreSQL и других баз данных, где настройки репликации напрямую влияют на баланс между скоростью и надёжностью.

---
Все обсуждают CAP, но редко говорят о PACELC. А зря. Если CAP — это про сбои, то PACELC добавляет: **а что, если всё хорошо?**

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
