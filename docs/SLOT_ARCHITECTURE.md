# Архитектура современного онлайн-слота (iGaming)

Документ описывает backend core engine, API и схему БД для сертифицированного слота.

---

## 1. BACKEND CORE ENGINE

### 1.1 RNG (Random Number Generator)

#### Certified RNG

- **Mersenne Twister (MT19937)** — типичный выбор для certified RNG в слотах:
  - Период 2^19937 − 1, равномерное распределение в [0, 1).
  - Детерминированность при одном seed для воспроизводимости аудита.
  - Сертификация: GLI-11, eCOGRA, iTech Labs и др. проверяют реализацию и тесты.

```text
Поток: External Entropy → Seed Generator → MT State → Next Random → Map to Reel/Symbol
```

- **Seed generation (серверная)**:
  - **True entropy**: `/dev/urandom`, HW RNG (если есть), timestamp, process ID.
  - **Формула**: `seed = HMAC(server_secret, concat(entropy_sources))` или просто криптостойкий random для инициализации MT.
  - Seed привязывается к `session_id` и `spin_id` и логируется для аудита (reproducibility).

- **Server-side vs client-side**:
  - **Outcome всегда на сервере**: результат спина (позиции символов, выигрыш, бонусы) вычисляется только на backend. Клиент не может повлиять на результат.
  - **Client-side**: только анимация и отображение уже выданного результата; клиент может использовать свой PRNG только для визуальных эффектов (particles, shuffle animation), но не для игровой логики.

---

### 1.2 Алгоритм расчёта спина (outcome до анимации)

1. **Вход**: `game_id`, `bet`, `currency`, `session_id`, опционально `feature_buy`, `bonus_round_id`.
2. **RNG**: из текущего состояния MT (или подсостояния для этой игры) получаем N случайных чисел (по числу позиций на барабанах).
3. **Mapping**: каждое число из [0,1) маппится в индекс символа на данном reel (reel strip — массив символов для каждого барабана). Учитывается **weighted RNG** (веса символов на полосе) для достижения целевого RTP и волатильности.
4. **Outcome matrix**: строится матрица символов [reels × rows], например 5×3.
5. **Paytable evaluation**: по правилам игры (линии, ways, scatter) считается выигрыш.
6. **Bonus logic**: проверка триггеров (scatter count, special symbols) → решение о Free Spins / Multiplier / Cascade и т.д.
7. **Фиксация**: результат сохраняется в БД, затем отдаётся клиенту. Клиент только анимирует уже известный outcome.

**Важно**: анимация на клиенте использует уже переданный outcome (порядок остановки барабанов может быть задан в ответе или жёстко на клиенте), чтобы исключить рассинхрон и читерство.

---

### 1.3 RTP (Return to Player)

- **Определение**: RTP = (сумма выплат за длительную игру) / (сумма ставок). Например, 96% значит, что в долгосрочной перспективе игроку возвращается 96% от поставленного.
- **Математическая реализация**:
  - Задаётся **target RTP** (96%, 97% и т.д.) на уровне конфига игры.
  - **Reel strips** и **symbol weights** подбираются так, чтобы математическое ожидание выигрыша на спин при данной ставке давало нужный RTP. Используется симуляция миллионов спинов для калибровки.
  - Формула по сути: `E[win per spin] = target_RTP * bet`. Достигается за счёт вероятностей символов на полосах и выплат по paytable.
- **Проверка**: периодический расчёт фактического RTP по реальным спинам (за период/по игре) для мониторинга и соответствия лицензии.

---

### 1.4 Volatility / Variance

- **Low**: частые мелкие выигрыши, редкие крупные — стабильная кривая баланса.
- **Medium**: баланс между частотой и размером выигрышей.
- **High**: редкие выигрыши, но крупные (в т.ч. джекпоты, бонусы).

**Реализация в механике**:
- **Frequency vs size**: задаётся распределением символов на reel strips (больше высокооплачиваемых символов → выше частота выигрышей; меньше, но с большими множителями → высокая волатильность).
- **Bonus frequency**: вероятность триггера Free Spins / бонусов влияет на variance (чаще бонусы — выше variance при прочих равных).
- В коде это набор конфигов (веса символов, размеры выплат, вероятности бонусов), подобранных под целевой RTP и выбранный уровень volatility.

---

### 1.5 Paytable Engine

- **Хранение**:
  - **Paytable**: таблица (symbol_id, count_min, count_max, multiplier_or_fixed, pay_per_line_or_ways).
  - Пример: символ "A" — 3 = 5x bet, 4 = 20x, 5 = 100x; линии или "all ways" (совпадения по позициям).
  - Хранится в БД (таблицы `paytable`, `paytable_lines`) или в конфиге игры (JSON/YAML).

- **Расчёт**:
  - После построения outcome matrix проверяются выигрышные комбинации:
    - **Line-based**: заданы линии (массивы позиций [reel][row]); для каждой линии смотрим символы, считаем длину совпадения с начала, берём выплату из paytable.
    - **Ways**: считаем количество "путей" (совпадений по позициям) для каждого символа, применяем paytable (часто выплата за N одинаковых символов на любых позициях).
  - Умножение на ставку (или на ставку за линию): `win = multiplier_from_paytable * bet_per_line * num_lines_played`.

---

### 1.6 Bonus Mechanics (Backend)

- **Free Spins**: отдельный режим (state), счётчик оставшихся спинов. Каждый спин в бонусе считается так же (RNG → outcome → paytable), но с возможными отличиями: другие веса символов, множители, дополнительные символы. Триггер: N scatter в одном спине.
- **Multipliers**: глобальный или per-spin множитель к выигрышу (например x2, x3). Хранится в контексте бонус-раунда или передаётся в расчёт выплаты.
- **Cascading Reels**: после спина удаляются выигрышные символы, сверху "падают" новые (новый RNG для освободившихся позиций), снова проверка выплат. Цикл до тех пор, пока есть новые выигрыши. Все каскады считаются на сервере в одном "логическом" спине (один spin_id, несколько cascade steps в ответе).
- **Buy Feature**: запрос клиента на покупку бонус-раунда за фиксированную сумму. Сервер проверяет баланс, списывает цену, запускает бонус-раунд (тот же движок Free Spins/Cascade и т.д.).

Все эти механики — часть одного **game state machine** на backend (base game → bonus → free spins → cascade steps), с единым RNG и сохранением каждого шага в БД.

---

## 2. API ENDPOINTS

Базовый URL: `https://api.example.com`  
Все запросы к игровому API требуют аутентификации.

### Auth

- **Header**: `Authorization: Bearer <JWT>`
- JWT содержит: `sub` (user_id), `session_id`, `iss`, `exp`. Проверка на каждом запросе.

---

### 2.1 POST /api/v1/game/init

Инициализация сессии игры, получение конфига (reel strips, paytable, правила).

**Request Headers**

| Header          | Value            |
|-----------------|------------------|
| Authorization   | Bearer \<JWT\>   |
| Content-Type    | application/json |

**Request Body**

```json
{
  "game_id": "slot_mega_fortune_001",
  "platform": "web",
  "locale": "en",
  "client_version": "1.2.0"
}
```

**Response 200 OK**

```json
{
  "session_id": "sess_abc123xyz",
  "game_id": "slot_mega_fortune_001",
  "config": {
    "reels": 5,
    "rows": 3,
    "paylines": 20,
    "currencies": ["USD", "EUR"],
    "min_bet": 0.10,
    "max_bet": 100.00,
    "bet_levels": [0.10, 0.20, 0.50, 1.00, 2.00, 5.00, 10.00, 25.00, 50.00, 100.00],
    "paytable_url": "https://cdn.example.com/games/slot_mega_fortune_001/paytable.json",
    "rules_url": "https://cdn.example.com/games/slot_mega_fortune_001/rules.html",
    "rtp": 96.5,
    "volatility": "high",
    "features": ["free_spins", "multipliers", "scatter", "buy_feature"]
  },
  "balance": {
    "amount": 1250.50,
    "currency": "USD"
  },
  "expires_at": "2025-02-26T12:00:00Z"
}
```

**Errors**

| Code | Description                    |
|------|--------------------------------|
| 400  | Invalid game_id or body       |
| 401  | Missing or invalid JWT        |
| 403  | Game not available in region  |
| 404  | Game not found                |
| 422  | Client version too old        |
| 500  | Internal server error         |

---

### 2.2 POST /api/v1/spin

Основной спин: ставка, обновление баланса, результат (outcome).

**Request Headers**

| Header        | Value          |
|---------------|----------------|
| Authorization | Bearer \<JWT\> |
| Content-Type  | application/json |

**Request Body**

```json
{
  "session_id": "sess_abc123xyz",
  "game_id": "slot_mega_fortune_001",
  "bet": {
    "amount": 1.00,
    "currency": "USD",
    "lines": 20
  },
  "client_timestamp": 1708851234567
}
```

**Response 200 OK**

```json
{
  "spin_id": "spin_xyz789",
  "session_id": "sess_abc123xyz",
  "game_id": "slot_mega_fortune_001",
  "balance": {
    "amount": 1248.50,
    "currency": "USD"
  },
  "bet": {
    "amount": 1.00,
    "currency": "USD"
  },
  "outcome": {
    "reel_matrix": [
      ["A", "K", "Q", "J", "10"],
      ["K", "A", "Scatter", "Q", "J"],
      ["Q", "J", "A", "K", "10"]
    ],
    "win": {
      "amount": 2.50,
      "currency": "USD",
      "breakdown": [
        { "type": "line", "line_index": 2, "symbol": "A", "count": 3, "payout": 2.50 }
      ]
    },
    "bonus_triggered": null
  },
  "next_state": "base_game",
  "timestamp": 1708851234600
}
```

Пример ответа с триггером Free Spins:

```json
{
  "spin_id": "spin_xyz790",
  "balance": { "amount": 1247.50, "currency": "USD" },
  "bet": { "amount": 1.00, "currency": "USD" },
  "outcome": {
    "reel_matrix": [ "..." ],
    "win": { "amount": 0, "currency": "USD", "breakdown": [] },
    "bonus_triggered": {
      "type": "free_spins",
      "free_spins_count": 10,
      "bonus_round_id": "br_abc111",
      "multiplier": 1
    }
  },
  "next_state": "free_spins"
}
```

**Errors**

| Code | Description                          |
|------|--------------------------------------|
| 400  | Invalid bet amount or session        |
| 401  | Missing or invalid JWT               |
| 403  | Session expired or game blocked      |
| 422  | Bet below min / above max, insufficient balance |
| 429  | Too many requests (rate limit)       |
| 500  | Internal server error                |

---

### 2.3 POST /api/v1/bonus/trigger

Триггер или продолжение бонусной механики (Free Spins спин, Buy Feature, и т.д.).

**Request (продолжение Free Spins)**

```json
{
  "session_id": "sess_abc123xyz",
  "game_id": "slot_mega_fortune_001",
  "bonus_round_id": "br_abc111",
  "action": "spin",
  "client_timestamp": 1708851240000
}
```

**Request (Buy Feature)**

```json
{
  "session_id": "sess_abc123xyz",
  "game_id": "slot_mega_fortune_001",
  "action": "buy_feature",
  "feature_id": "free_spins_10",
  "client_timestamp": 1708851240000
}
```

**Response 200 OK (спин в бонусе)**

```json
{
  "spin_id": "spin_xyz791",
  "bonus_round_id": "br_abc111",
  "balance": { "amount": 1255.00, "currency": "USD" },
  "outcome": {
    "reel_matrix": [ "..." ],
    "win": { "amount": 7.50, "currency": "USD", "breakdown": [ "..." ] },
    "free_spins_remaining": 8,
    "total_free_spins": 10,
    "multiplier": 2
  },
  "next_state": "free_spins"
}
```

**Response 200 OK (бонус завершён)**

```json
{
  "spin_id": "spin_xyz799",
  "bonus_round_id": "br_abc111",
  "balance": { "amount": 1280.00, "currency": "USD" },
  "outcome": {
    "reel_matrix": [ "..." ],
    "win": { "amount": 25.00, "currency": "USD", "breakdown": [ "..." ] },
    "free_spins_remaining": 0,
    "bonus_summary": {
      "total_win": 125.50,
      "spins_played": 10
    }
  },
  "next_state": "base_game"
}
```

**Errors**

| Code | Description                                      |
|------|--------------------------------------------------|
| 400  | Invalid action or missing bonus_round_id         |
| 401  | Missing or invalid JWT                          |
| 403  | Not in bonus state / buy not allowed             |
| 422  | Insufficient balance for buy_feature            |
| 404  | bonus_round_id not found                        |
| 500  | Internal server error                           |

---

### 2.4 GET /api/v1/history

История спинов (пагинация).

**Request Headers**

| Header        | Value          |
|---------------|----------------|
| Authorization | Bearer \<JWT\> |

**Query Parameters**

| Param   | Type   | Description        |
|---------|--------|--------------------|
| game_id | string | optional, filter   |
| from_ts | int    | optional, unix ms  |
| to_ts   | int    | optional, unix ms  |
| limit   | int    | default 50, max 100 |
| offset  | int    | default 0          |

**Example**: `GET /api/v1/history?game_id=slot_mega_fortune_001&limit=20&offset=0`

**Response 200 OK**

```json
{
  "items": [
    {
      "spin_id": "spin_xyz789",
      "game_id": "slot_mega_fortune_001",
      "timestamp": 1708851234600,
      "bet": { "amount": 1.00, "currency": "USD" },
      "win": { "amount": 2.50, "currency": "USD" },
      "state": "base_game"
    },
    {
      "spin_id": "spin_xyz788",
      "game_id": "slot_mega_fortune_001",
      "timestamp": 1708851228000,
      "bet": { "amount": 1.00, "currency": "USD" },
      "win": { "amount": 0, "currency": "USD" },
      "state": "base_game"
    }
  ],
  "total": 15420,
  "limit": 20,
  "offset": 0
}
```

**Errors**

| Code | Description              |
|------|--------------------------|
| 401  | Missing or invalid JWT   |
| 422  | Invalid limit/offset     |
| 500  | Internal server error    |

---

### 2.5 WebSocket /ws/game

Real-time соединение: уведомления о балансе, блокировках, промо, завершении бонус-раунда с другого устройства.

**Connection**

- URL: `wss://api.example.com/ws/game`
- Query или subprotocol: передача JWT, например `?token=<JWT>` или в первом сообщении после open.

**Client → Server (опционально)**

```json
{ "type": "subscribe", "channel": "balance" }
{ "type": "subscribe", "channel": "game_events", "game_id": "slot_mega_fortune_001" }
```

**Server → Client**

```json
{ "type": "balance_updated", "balance": { "amount": 1250.50, "currency": "USD" }, "ts": 1708851300000 }
{ "type": "game_event", "game_id": "slot_mega_fortune_001", "event": "bonus_completed", "bonus_round_id": "br_abc111", "total_win": 125.50 }
{ "type": "maintenance", "message": "Scheduled maintenance in 5 min" }
```

**Errors (close frame)**

- 4000: Invalid token
- 4001: Session expired
- 4002: Rate limit

---

## 3. DATABASE SCHEMA

Условные типы: PostgreSQL (BIGINT, NUMERIC, JSONB, TIMESTAMPTZ).

### users

| Column         | Type         | Description                |
|----------------|--------------|----------------------------|
| id             | BIGSERIAL    | PK                         |
| external_id    | VARCHAR(64)  | UNIQUE, id из identity provider |
| email          | VARCHAR(255) | nullable                   |
| country_code   | CHAR(2)      | ISO 3166-1                  |
| currency       | CHAR(3)      | default currency           |
| status         | VARCHAR(20)  | active, blocked, self_excluded |
| created_at     | TIMESTAMPTZ  |                            |
| updated_at     | TIMESTAMPTZ  |                            |
| metadata       | JSONB        | optional                   |

### sessions

| Column       | Type         | Description                    |
|--------------|--------------|--------------------------------|
| id           | BIGSERIAL    | PK                             |
| session_id   | VARCHAR(64)  | UNIQUE, public session id      |
| user_id      | BIGINT       | FK → users.id                  |
| game_id      | VARCHAR(64)  |                                |
| platform     | VARCHAR(32)  | web, ios, android              |
| status       | VARCHAR(20)  | active, closed, expired        |
| created_at   | TIMESTAMPTZ  |                                |
| expires_at   | TIMESTAMPTZ  |                                |
| closed_at    | TIMESTAMPTZ  | nullable                       |

### spins

| Column          | Type         | Description                         |
|-----------------|--------------|-------------------------------------|
| id              | BIGSERIAL    | PK                                  |
| spin_id         | VARCHAR(64)  | UNIQUE, public spin id              |
| session_id      | BIGINT       | FK → sessions.id                    |
| user_id         | BIGINT       | FK → users.id (денормализация)      |
| game_id         | VARCHAR(64)  |                                     |
| bet_amount      | NUMERIC(18,4)|                                     |
| bet_currency    | CHAR(3)      |                                     |
| win_amount      | NUMERIC(18,4)|                                     |
| win_currency    | CHAR(3)      |                                     |
| state_before    | VARCHAR(32)  | base_game, free_spins, etc.         |
| state_after     | VARCHAR(32)  |                                     |
| outcome         | JSONB        | reel_matrix, win breakdown, bonus   |
| rng_seed        | BIGINT       | или VARCHAR для аудита (опционально)|
| bonus_round_id  | VARCHAR(64)  | nullable, FK логический             |
| created_at      | TIMESTAMPTZ  |                                     |

### balances

| Column     | Type         | Description        |
|------------|--------------|--------------------|
| id         | BIGSERIAL    | PK                 |
| user_id    | BIGINT       | FK → users.id UNIQUE per (user_id, currency) |
| currency   | CHAR(3)      |                    |
| amount     | NUMERIC(18,4)| текущий баланс     |
| version    | INTEGER      | optimistic lock    |
| updated_at | TIMESTAMPTZ  |                    |

### bonus_rounds

| Column           | Type         | Description                    |
|------------------|--------------|--------------------------------|
| id               | BIGSERIAL    | PK                             |
| bonus_round_id   | VARCHAR(64)  | UNIQUE                         |
| session_id       | BIGINT       | FK → sessions.id               |
| user_id          | BIGINT       | FK → users.id                  |
| game_id          | VARCHAR(64)  |                                |
| type             | VARCHAR(32)  | free_spins, bonus_game, etc.   |
| status           | VARCHAR(20)  | active, completed, expired     |
| total_spins      | INTEGER      | запланировано (e.g. 10)       |
| spins_played     | INTEGER      | default 0                      |
| total_win        | NUMERIC(18,4)| накопленный выигрыш в бонусе   |
| config           | JSONB        | multiplier, reel set, etc.     |
| created_at       | TIMESTAMPTZ  |                                |
| completed_at     | TIMESTAMPTZ  | nullable                       |

### transactions

Иммутабельный журнал движений по балансу (ставка, выигрыш, депозит, бонус, админ).

| Column       | Type         | Description                    |
|--------------|--------------|--------------------------------|
| id           | BIGSERIAL    | PK                             |
| transaction_id | VARCHAR(64) | UNIQUE                         |
| user_id      | BIGINT       | FK → users.id                  |
| type         | VARCHAR(32)  | bet, win, deposit, withdrawal, bonus, adjustment |
| amount       | NUMERIC(18,4)| положительный = кредит        |
| currency     | CHAR(3)      |                                |
| balance_after| NUMERIC(18,4)| баланс после операции          |
| reference_type | VARCHAR(32) | spin, bonus_round, deposit_id  |
| reference_id | VARCHAR(64)  | spin_id, bonus_round_id, etc.  |
| created_at   | TIMESTAMPTZ  |                                |
| metadata     | JSONB        | optional                       |

---

### Индексы (рекомендуемые)

- `spins(user_id, created_at)`, `spins(session_id, created_at)`, `spins(game_id, created_at)` — история и отчёты.
- `transactions(user_id, created_at)` — выписка по счёту.
- `bonus_rounds(session_id, status)` — поиск активного бонуса.
- `sessions(user_id, status)`, `sessions(session_id)`.

---

*Документ можно использовать как референс для разработки backend слота и интеграции с клиентом.*
