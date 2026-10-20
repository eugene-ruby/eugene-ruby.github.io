---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: Как использовать WHERE для JSONB в PostgreSQL. Разбираем JSONB-запросы на живых
  данных с генерацией тестового стенда на 10.000 строк
date: '2025-04-20 11:00:00 +0300'
categories:
- postgres
- database
tags: PostgreSQL  JSONB SQL performance
rate: 3
hero_image: "/images/posts/background_post-0058.webp"
---
PostgreSQL с поддержкой JSONB — это ~~бездонная~~ магическая сумка разработчика: можно хранить полуструктурированные данные и при этом эффективно их фильтровать. В статье разберём реальные примеры запросов с `WHERE` по JSONB-полям и соберём тестовый стенд для экспериментов.

---

## 🤔 JSON vs JSONB, что это за `B`

Поле JSONB позволяет хранить полуструктурированные данные в формате JSON. В отличие от обычного JSON, тип JSONB хранится в `бинарном` виде и поддерживает индексацию. Это даёт возможность эффективно фильтровать и комбинировать данные с реляционной моделью.

## 🧱 Подготовка стенда

Прежде чем прыгать в запросы, создадим тестовую среду. Вот Docker-композ для PostgreSQL + скрипт генерации данных:

```bash
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: test
    ports:
      - "5432:5432"
    volumes:
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
```

```sql
-- init.sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  attributes JSONB NOT NULL
);

-- Генератор тестовых данных
INSERT INTO products (name, attributes)
SELECT 
  'Product ' || i,
  jsonb_build_object(
    'price', (random() * 100)::numeric(10,2),
    'tags', CASE WHEN random() > 0.5 
           THEN jsonb_build_array('sale', 'new') 
           ELSE jsonb_build_array('popular') END,
    'specs', jsonb_build_object(
      'weight', (random() * 10)::numeric(5,2),
      'color', CASE floor(random()*4)
               WHEN 0 THEN 'red'
               WHEN 1 THEN 'blue'
               ELSE 'black' END
    )
  )
FROM generate_series(1, 10000) AS i;
```

---

### Описание стенда

#### Что хранится в `attributes`

Поле `attributes` содержит JSONB-объект с такими ключами:

| Ключ    | Тип данных             | Пример значения                      |
| ------- | ---------------------- | ------------------------------------ |
| `price` | число (decimal)        | `49.75`                              |
| `tags`  | массив строк           | `["sale", "new"]` или `["popular"]`  |
| `specs` | вложенный объект JSONB | `{ "weight": 3.42, "color": "red" }` |

---

#### Пример одной строки

```json
{
  "price": 67.23,
  "tags": ["sale", "new"],
  "specs": {
    "weight": 7.85,
    "color": "black"
  }
}
```

---

### 🚀 Запускаем

```bash
docker-compose up -d
psql -d postgres -h 127.0.0.1 -U postgres -W
```
пароль `test`

или через контейнер: `docker ps` получаем название, у меня `jsonb-where-postgres-postgres-1`
```bash
docker exec -it jsonb-where-postgres-postgres-1 bash
psql -U postgres
```

```bash
SELECT COUNT(*) FROM products;
 count 
-------
  10000
```

Теперь у нас есть 10.000 товаров с разными атрибутами в JSONB.

---

## 🔍 Базовые операции WHERE с JSONB

### 1. Поиск по значению ключа
```sql
-- Товары красного цвета
SELECT name, attributes->'specs'->>'color' AS color
FROM products
WHERE attributes->'specs'->>'color' = 'red';
```

### 2. Фильтр по числовому значению
```sql
-- Товары дешевле 50
SELECT name, attributes->>'price' AS price
FROM products
WHERE (attributes->>'price')::numeric < 50;
```

### 3. Проверка наличия ключа
```sql
-- Товары с указанным весом
SELECT name 
FROM products
WHERE attributes->'specs' ? 'weight';
```

---

## 🧩 Продвинутые сценарии

### Поиск по массиву тегов
```sql
-- Товары с тегом 'sale'
SELECT name, attributes->'tags' AS tags
FROM products
WHERE attributes->'tags' @> '["sale"]'::jsonb;
```

### Комбинированные условия
```sql
-- Красные товары со скидкой тяжелее 5 кг
SELECT name
FROM products
WHERE attributes->'specs'->>'color' = 'red'
  AND (attributes->'specs'->>'weight')::numeric > 5
  AND attributes->'tags' @> '["sale"]'::jsonb;
```

### Использование GIN-индексов
Для ускорения поиска по JSONB:

```sql
CREATE INDEX idx_products_attributes ON products USING GIN (attributes jsonb_path_ops);
```
> И все? в JSONB так легко с индексацией? Ага, сейчас 😅 Это самый простой пример, а там уйма своих приколов и боли! 🤯

## 🚀 Производительность: EXPLAIN на практике

Проверим разницу с индексом и без:
```sql
EXPLAIN ANALYZE
SELECT * FROM products
WHERE attributes @> '{"tags": ["sale"]}'::jsonb;
```

До индекса:
```
  Seq Scan on products  (cost=0.00..334.00 rows=4949 width=136) (actual time=0.014..7.555 rows=4969 loops=1)
```

После создания GIN-индекса:
```
 Bitmap Heap Scan on products  (cost=54.36..325.22 rows=4949 width=136) (actual time=0.519..3.522 rows=4969 loops=1)
```

Для экспериментов можно удалить индекс
```sql
DROP INDEX idx_products_attributes;
```

> ⚠️ Мы создали 10 000 строк, чтобы планировщик запросов не «ленился» использовать индекс, и вы не ленитесь делать стенд приближенный к продакшену.

---

## 💥 Антипаттерны

1. **Игнорирование типов**  
   ```sql
   -- Плохо: неявное приведение типов
   WHERE attributes->>'price' < '50';
   
   -- Хорошо: явное приведение
   WHERE (attributes->>'price')::numeric < 50;
   ```

2. **Избыточные операции**  
   Вместо цепочки `->'a'->'b'->>'c'` используйте `#>>'{a,b,c}'`:
   ```sql
   -- Оптимально:
   WHERE attributes#>>'{specs,color}' = 'red';
   ```

3. **Отсутствие индексов**  
   Поиск по JSONB без индексов на больших таблицах — путь к медленным запросам.

---

## 🤓Вывод

1. **JSONB в PostgreSQL** — мощный инструмент, но требующий аккуратного обращения
2. **Используйте операторы `@>`, `?`, `->>`** в зависимости от сценария
3. **Не забывайте про индексы** для часто фильтруемых полей
4. **Тестируйте планы запросов** — EXPLAIN ваш лучший друг
