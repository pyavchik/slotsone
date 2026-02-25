# Postman: Slots API — Regression Suite

Коллекция и окружение для тестирования API слота (Happy Path, Negative, Security).

## Файлы

| Файл | Описание |
|------|----------|
| `slots-collection.json` | Коллекция запросов и тестов (TC-01 … TC-14) |
| `dev.env.json` | Окружение: base_url, jwt_token, session_id, user_id, game_id |

## Environment Variables

Импортируйте окружение в Postman и задайте значения:

| Переменная | Пример | Описание |
|------------|--------|----------|
| `base_url` | `http://localhost:3001` | Базовый URL API |
| `jwt_token` | `eyJhbGciOiJSUzI1NiIs...` | JWT (Bearer) |
| `session_id` | `(set by TC-01)` | Идентификатор игровой сессии (можно перезаписать из ответа TC-01) |
| `user_id` | `12345` | ID пользователя (для проверок IDOR) |
| `game_id` | `slot_mega_fortune_001` | ID игры |

Остальные (`last_spin_id`, `balance_before_spin`, `idempotency_key`) заполняются скриптами.

## Тест-кейсы

### Happy Path
- **TC-01**: POST /api/v1/game/init — 200, session_id, config (min/max bet), balance.
- **TC-02**: POST /api/v1/spin — 200, spin_id, outcome.reel_matrix, outcome.win, balance; сохраняет last_spin_id и last_balance_amount.
- **TC-03**: POST /api/v1/spin — проверка: баланс изменился на `-bet + win`.
- **TC-04**: POST /api/v1/spin — проверка структуры outcome (при наличии bonus_triggered — тип free_spins/bonus).

### Negative Testing
- **TC-05**: POST /spin без Authorization — 401.
- **TC-06**: POST /spin с bet > баланса — 422, сообщение про insufficient balance.
- **TC-07**: POST /spin с bet.amount = -100 — 400.
- **TC-08**: POST /spin дважды с одним Idempotency-Key — 409 или 200 с тем же spin_id.
- **TC-09**: POST /spin с JWT alg:none — 401.
- **TC-10**: GET /history?user_id=99999 — 403 или 200 только со своими данными.

### Security Testing
- **TC-11**: POST /spin с bet.amount = "1; DROP TABLE spins;--" — 4xx, не 500.
- **TC-12**: POST /spin с session_id = "<script>alert(1)</script>" — 4xx, в ответе нет неэкранированного `<script>`.
- **TC-13**: Rate limit — один запрос; полный тест: 50+ запросов/сек → ожидание 429.
- **TC-14**: Replay — два запроса с одним Idempotency-Key; второй: 200 с тем же spin_id или 409.

## Запуск в Postman

1. Импорт: **Import** → `slots-collection.json` и `dev.env.json`.
2. Выберите окружение **Slots API - Dev** в правом верхнем углу.
3. Подставьте реальный `jwt_token` и при необходимости `session_id` (или получите их из TC-01).
4. Запуск одного запроса: откройте запрос → **Send** → смотрите вкладку **Test Results**.
5. Запуск всей коллекции: **Collection Runner** (см. ниже).

## Collection Runner (Regression Suite)

1. Правый клик по коллекции **Slots API - Full Regression** → **Run collection**.
2. Выберите окружение **Slots API - Dev**.
3. Опции:
   - **Iterations**: 1 (для полного прогона по одному разу).
   - **Delay**: при необходимости (например 100 ms между запросами, чтобы не сработал rate limit на счастливом пути).
4. **Run Slots API - Full Regression** — все запросы выполняются по порядку, тесты отображаются в отчёте.

Порядок папок: Happy Path → Negative Testing → Security Testing. TC-01 выполняется первым и может обновить `session_id` в окружении для последующих запросов.

## Newman CLI

Установка:

```bash
npm install -g newman
npm install -g newman-reporter-htmlextra
```

Запуск коллекции с окружением:

```bash
cd postman
newman run slots-collection.json -e dev.env.json
```

С HTML-отчётом (htmlextra):

```bash
newman run slots-collection.json -e dev.env.json -r htmlextra --reporter-htmlextra-export report.html
```

После выполнения откройте `report.html` в браузере.

Дополнительные опции Newman:

```bash
# С задержкой 200 ms между запросами (снижение нагрузки / rate limit)
newman run slots-collection.json -e dev.env.json -d 200

# Таймаут запроса 10 сек
newman run slots-collection.json -e dev.env.json --timeout-request 10000

# Переменные из CLI
newman run slots-collection.json -e dev.env.json --env-var "base_url=https://api.casino-staging.com"
```

## Репорт: htmlextra

- Установка: `npm install -g newman-reporter-htmlextra`
- Запуск с экспортом:  
  `newman run slots-collection.json -e dev.env.json -r htmlextra --reporter-htmlextra-export postman-report.html`
- В отчёте: статусы запросов, утверждения (pass/fail), время выполнения, возможность фильтра по папкам/запросам.

## Замечания

- **TC-06**: для стабильного 422 нужен пользователь с нулевым балансом или ставка больше текущего баланса (например 999999).
- **TC-08**: для проверки идемпотентности запустите запрос TC-08 дважды подряд с одним и тем же Idempotency-Key (в env задайте фиксированный `idempotency_key` или отредактируйте заголовок на константу).
- **TC-13**: полная проверка rate limit — отдельный сценарий (много итераций за короткое время); в коллекции один запрос лишь проверяет 200/429 и наличие Retry-After при 429.
