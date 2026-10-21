---
layout: post
subtitle: <div id="terminal"></div>
version: 3.2.2
toc: true
menubar_toc: true
hero_darken: true
title: 'Как использовать WHERE с JSONB в PostgreSQL: запросы и стенд на 10 000 строк'
short_description: 'Примеры фильтрации JSONB в PostgreSQL: поиск по ключам, числам,
  вложенным объектам и массивам. Покажем, как создать стенд на 10 000 строк и проверить
  применимость GIN-индекса через EXPLAIN ANALYZE.'
date: '2025-04-20 11:00:00 +0300'
categories:
- postgres
- database
tags: PostgreSQL  JSONB SQL performance
rate: 3
hero_image: "/images/posts/background_post-0058.webp"
---
PostgreSQL с поддержкой JSONB — это ~~бездонная~~ магическая сумка разработчика: можно хранить полуструктурированные данные и фильтровать их вместе с обычными столбцами. Разберём запросы с `WHERE` по JSONB-полю и соберём тестовый стенд для экспериментов.

---

## 🤔 JSON vs JSONB, что это за `B`

Типы `json` и `jsonb` позволяют хранить данные в формате JSON. `json` сохраняет исходный текст, а `jsonb` разбирает его и хранит во внутреннем бинарном представлении. Для `jsonb` доступны операторы поиска и индексы, но индекс нужно подбирать под конкретное условие запроса.

## 🧱 Подготовка стенда

Создадим тестовую среду. Сохраните конфигурацию как `docker-compose.yml`, а SQL-скрипт — как `init.sql` в той же папке:

```yaml
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

| Ключ    | Тип данных             | Пример значения                     |
| ------- | ---------------------- | ----------------------------------- |
| `price` | число                  | `49.75`                             |
| `tags`  | массив строк           | `["sale", "new"]` или `["popular"]` |
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
docker compose up -d
psql -d postgres -h 127.0.0.1 -U postgres -W
```

Пароль — `test`. Если `psql` не установлен на хосте, подключитесь через контейнер:

```bash
docker compose exec postgres psql -U postgres
```

Проверьте количество строк:

```sql
SELECT COUNT(*) FROM products;
```

Ожидаемый результат — `10000`. Скрипт из `/docker-entrypoint-initdb.d/` выполняется при первоначальной инициализации базы, а не при каждом запуске контейнера.

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

Оператор `->>` возвращает текст, поэтому для числового сравнения значение нужно привести к `numeric`.

### 3. Проверка наличия ключа

```sql
-- Товары, у которых в specs есть ключ weight
SELECT name
FROM products
WHERE attributes->'specs' ? 'weight';
```

`?` проверяет наличие ключа в объекте, к которому применён оператор. Этот запрос не проверяет, является ли вес числом.

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
-- Красные товары с тегом sale тяжелее 5 кг
SELECT name
FROM products
WHERE attributes->'specs'->>'color' = 'red'
  AND (attributes->'specs'->>'weight')::numeric > 5
  AND attributes->'tags' @> '["sale"]'::jsonb;
```

### Использование GIN-индексов

Для условия `@>` по всему полю `attributes` можно создать GIN-индекс:

```sql
CREATE INDEX idx_products_attributes ON products USING GIN (attributes jsonb_path_ops);
```

Здесь важна форма условия: индекс рассчитан, в частности, на `attributes @> ...`. Он не ускорит автоматически все запросы выше. Для проверки ключа оператором `?` по `attributes->'specs'` или фильтрации по тексту и числам, извлечённым из JSONB, понадобятся индексы под соответствующие выражения, если такие запросы достаточно часты.

## 🚀 Производительность: EXPLAIN на практике

Сравните план до создания индекса и после него. После загрузки данных обновите статистику планировщика:

```sql
ANALYZE products;

EXPLAIN ANALYZE
SELECT * FROM products
WHERE attributes @> '{"tags": ["sale"]}'::jsonb;
```

После создания индекса из предыдущего раздела повторите `EXPLAIN ANALYZE`. В одном из запусков план до индекса начинался с `Seq Scan on products`, а после — с `Bitmap Heap Scan on products`. Это не гарантированный результат: данные генерируются случайно, и тег `sale` встречается примерно у половины товаров. При такой доле совпадений планировщик может предпочесть последовательное чтение даже при наличии индекса. Смотрите на план и время выполнения в своей среде, а не только на факт создания индекса.

Для нового эксперимента индекс можно удалить:

```sql
DROP INDEX idx_products_attributes;
```

10 000 строк позволяют попробовать разные запросы, но сами по себе не заставляют планировщик использовать индекс. Для выводов о производительности нужен стенд, похожий на рабочую нагрузку по объёму и распределению данных.

---

## 💥 Антипаттерны

1. **Игнорирование типов**

   ```sql
   -- Лексикографическое сравнение текста, а не сравнение чисел:
   WHERE attributes->>'price' < '50';

   -- Числовое сравнение:
   WHERE (attributes->>'price')::numeric < 50;
   ```

   Оператор `->>` возвращает текст: например, строка `'100'` при сравнении с `'50'` не ведёт себя как число 100. Приведение к `numeric` подходит, если значение всегда числовое, как в нашем стенде; неожиданный текст вместо числа вызовет ошибку приведения.

2. **Лишняя сложность при обращении к вложенным полям**

   Цепочку `->'specs'->>'color'` можно записать через путь:

   ```sql
   WHERE attributes#>>'{specs,color}' = 'red';
   ```

   Это альтернативная запись, а не гарантированное ускорение. При выборе формы учитывайте читаемость и индекс, если он нужен запросу.

3. **Индексы без учёта условий запроса**

   На большой таблице частый поиск без подходящего индекса может быть медленным. Но индекс добавляет расходы на хранение и изменение данных, а для условия, которое выбирает значительную часть таблицы, последовательное чтение может оказаться выгоднее. Проверяйте план для конкретного запроса.

---

## 🤓Вывод

1. JSONB позволяет фильтровать вложенные данные, но результат `->>` — текст: учитывайте тип при сравнении.
2. Выбирайте операторы `@>`, `?`, `->>` под задачу и проверяйте, к какому JSONB-значению они применены.
3. Подбирайте индекс под выражение в `WHERE`, а его пользу оценивайте по плану `EXPLAIN ANALYZE` на подходящих данных.