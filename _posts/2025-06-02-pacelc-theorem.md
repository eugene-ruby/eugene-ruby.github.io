---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'PACELC — дополнение к CAP: а если разделения сети нет?'
date: '2025-06-02 10:00:00 +0300'
categories:
- architecture
- database
tags:
- CAP Theorem
- Consistency
- Distributed Systems
- PACELC
- Replication
rate: 3
hero_image: "/images/posts/background_post-0101.webp"
---
В распределённых системах CAP-теорема давно стала классикой, а PACELC обсуждают реже. CAP описывает выбор при разделении сети [1]. PACELC добавляет ещё один вопрос: как система балансирует между задержкой и консистентностью, когда разделения нет [2]? Для PostgreSQL и других баз данных этот вопрос возникает, например, при выборе режима репликации.

---

Все обсуждают CAP, но редко говорят о PACELC. А зря. Если CAP — о поведении системы при разделении сети, то PACELC спрашивает: **а что, если сеть работает?**

## 🤯 Что такое PACELC?

> Если происходит разделение сети (P), система выбирает между доступностью (A) и консистентностью (C),  
> **а в остальное время (E)** — между задержкой (L) и консистентностью (C) [2].

### Расшифровка:
**PACELC** = *Partition / Availability / Consistency / Else / Latency / Consistency*

---

## 🔄 Пример с PostgreSQL

- При разделении сети (P):
    - **Patroni** может выполнить failover. Настройки кластера определяют, какие гарантии сохранности подтверждённых записей и какой уровень доступности удастся обеспечить.
- В остальное время (E):
    - При синхронной репликации коммит ждёт подтверждения от реплики. Это увеличивает задержку, но снижает риск потери подтверждённых записей при переключении. Асинхронная репликация не требует такого ожидания, но допускает потерю последних записей при failover [3].

---

## 📌 Вывод

CAP помогает рассуждать о разделении сети. PACELC дополняет эту картину компромиссом, который возникает и при штатной работе. Если ты строишь HA-систему, полезно учитывать оба сценария.

---

## 🔗 Источники

1. [Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services — Seth Gilbert, Nancy Lynch](https://dl.acm.org/doi/10.1145/564585.564601)
2. [Consistency Tradeoffs in Modern Distributed Database System Design: CAP is Only Part of the Story — Daniel Abadi](https://ieeexplore.ieee.org/document/6155642)
3. [PostgreSQL Documentation: Synchronous Replication — Log-Shipping Standby Servers](https://www.postgresql.org/docs/current/warm-standby.html#SYNCHRONOUS-REPLICATION)
