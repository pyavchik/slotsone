# Architecture of a Modern Online Slot (iGaming)

This document describes the backend core engine, API, and database schema for a certified slot.

---

## 1. BACKEND CORE ENGINE

### 1.1 RNG (Random Number Generator)

#### Certified RNG

- **Mersenne Twister (MT19937)** — a typical choice for a certified RNG in slots:
  - Period 2^19937 − 1, uniform distribution in [0, 1).
  - Deterministic with a single seed for audit reproducibility.
  - Certification: GLI-11, eCOGRA, iTech Labs, and others verify the implementation and tests.

```text
Flow: External Entropy → Seed Generator → MT State → Next Random → Map to Reel/Symbol
```

- **Seed generation (server-side)**:
  - **True entropy**: `/dev/urandom`, HW RNG (if available), timestamp, process ID.
  - **Formula**: `seed = HMAC(server_secret, concat(entropy_sources))` or simply a cryptographically secure random for MT initialization.
  - The seed is bound to `session_id` and `spin_id` and logged for audit (reproducibility).

- **Server-side vs client-side**:
  - **Outcome always on the server**: the spin result (symbol positions, win, bonuses) is computed solely on the backend. The client cannot influence the outcome.
  - **Client-side**: only animation and display of the already-determined result; the client may use its own PRNG only for visual effects (particles, shuffle animation), but not for game logic.

---

### 1.2 Spin Outcome Calculation Algorithm (outcome before animation)

1. **Input**: `game_id`, `bet`, `currency`, `session_id`, optionally `feature_buy`, `bonus_round_id`.
2. **RNG**: from the current MT state (or sub-state for this game) we obtain N random numbers (one per reel position).
3. **Mapping**: each number from [0,1) is mapped to a symbol index on the given reel (reel strip — an array of symbols for each reel). **Weighted RNG** (symbol weights on the strip) is applied to achieve the target RTP and volatility.
4. **Outcome matrix**: a symbol matrix [reels × rows] is built, e.g. 5×3.
5. **Paytable evaluation**: the win is calculated according to the game rules (lines, ways, scatter).
6. **Bonus logic**: trigger checks (scatter count, special symbols) → decision on Free Spins / Multiplier / Cascade, etc.
7. **Commit**: the result is saved to the database, then returned to the client. The client only animates the already-known outcome.

**Important**: the client-side animation uses the already-transmitted outcome (the reel stop order may be specified in the response or hardcoded on the client) to eliminate desync and cheating.

---

### 1.3 RTP (Return to Player)

- **Definition**: RTP = (total payouts over extended play) / (total bets). For example, 96% means that in the long run the player gets back 96% of the amount wagered.
- **Mathematical implementation**:
  - A **target RTP** (96%, 97%, etc.) is set at the game config level.
  - **Reel strips** and **symbol weights** are calibrated so that the expected win per spin at the given bet produces the required RTP. Millions of simulated spins are used for calibration.
  - The formula in essence: `E[win per spin] = target_RTP * bet`. Achieved through symbol probabilities on the strips and paytable payouts.
- **Verification**: periodic calculation of the actual RTP from real spins (per period / per game) for monitoring and licence compliance.

---

### 1.4 Volatility / Variance

- **Low**: frequent small wins, rare large wins — a stable balance curve.
- **Medium**: a balance between win frequency and win size.
- **High**: rare but large wins (including jackpots, bonuses).

**Implementation in the mechanics**:
- **Frequency vs size**: set by the distribution of symbols on the reel strips (more high-paying symbols → higher win frequency; fewer symbols with larger multipliers → high volatility).
- **Bonus frequency**: the probability of triggering Free Spins / bonuses affects variance (more frequent bonuses — higher variance, all else being equal).
- In code this is a set of configs (symbol weights, payout sizes, bonus probabilities) tuned to the target RTP and the chosen volatility level.

---

### 1.5 Paytable Engine

- **Storage**:
  - **Paytable**: a table (symbol_id, count_min, count_max, multiplier_or_fixed, pay_per_line_or_ways).
  - Example: symbol "A" — 3 = 5x bet, 4 = 20x, 5 = 100x; lines or "all ways" (matches by position).
  - Stored in the database (tables `paytable`, `paytable_lines`) or in the game config (JSON/YAML).

- **Calculation**:
  - After the outcome matrix is built, winning combinations are checked:
    - **Line-based**: lines are defined (arrays of positions [reel][row]); for each line the symbols are examined, the match length from the start is counted, and the payout is taken from the paytable.
    - **Ways**: the number of "ways" (position matches) for each symbol is counted and the paytable is applied (typically the payout is for N identical symbols at any positions).
  - Multiplication by bet (or by bet per line): `win = multiplier_from_paytable * bet_per_line * num_lines_played`.

---

### 1.6 Bonus Mechanics (Backend)

- **Free Spins**: a separate mode (state) with a remaining-spins counter. Each spin in the bonus is evaluated the same way (RNG → outcome → paytable), but with possible differences: different symbol weights, multipliers, additional symbols. Trigger: N scatters in a single spin.
- **Multipliers**: a global or per-spin multiplier applied to the win (e.g. x2, x3). Stored in the bonus-round context or passed into the payout calculation.
- **Cascading Reels**: after a spin, winning symbols are removed and new ones "fall" from above (new RNG for the freed positions), then payouts are checked again. The cycle continues as long as new wins appear. All cascades are calculated on the server within a single "logical" spin (one spin_id, multiple cascade steps in the response).
- **Buy Feature**: a client request to purchase a bonus round for a fixed amount. The server checks the balance, deducts the price, and launches the bonus round (the same Free Spins/Cascade engine, etc.).

All these mechanics are part of a single **game state machine** on the backend (base game → bonus → free spins → cascade steps), with a unified RNG and each step saved to the database.

---

## 2. API ENDPOINTS

Base URL: `https://api.example.com`
All requests to the game API require authentication.

### Auth

- **Header**: `Authorization: Bearer <JWT>`
- JWT contains: `sub` (user_id), `session_id`, `iss`, `exp`. Verified on every request.

---

### 2.1 POST /api/v1/game/init

Initializes a game session and retrieves the config (reel strips, paytable, rules).

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

Main spin: bet placement, balance update, result (outcome).

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

Example response with a Free Spins trigger:

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

Trigger or continuation of a bonus mechanic (Free Spins spin, Buy Feature, etc.).

**Request (Free Spins continuation)**

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

**Response 200 OK (spin in bonus)**

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

**Response 200 OK (bonus completed)**

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

Spin history (paginated).

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

Real-time connection: balance notifications, blocks, promotions, bonus-round completion from another device.

**Connection**

- URL: `wss://api.example.com/ws/game`
- Query or subprotocol: JWT delivery, e.g. `?token=<JWT>` or in the first message after open.

**Client → Server (optional)**

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

Column types: PostgreSQL (BIGINT, NUMERIC, JSONB, TIMESTAMPTZ).

### users

| Column         | Type         | Description                |
|----------------|--------------|----------------------------|
| id             | BIGSERIAL    | PK                         |
| external_id    | VARCHAR(64)  | UNIQUE, id from identity provider |
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
| user_id         | BIGINT       | FK → users.id (denormalization)     |
| game_id         | VARCHAR(64)  |                                     |
| bet_amount      | NUMERIC(18,4)|                                     |
| bet_currency    | CHAR(3)      |                                     |
| win_amount      | NUMERIC(18,4)|                                     |
| win_currency    | CHAR(3)      |                                     |
| state_before    | VARCHAR(32)  | base_game, free_spins, etc.         |
| state_after     | VARCHAR(32)  |                                     |
| outcome         | JSONB        | reel_matrix, win breakdown, bonus   |
| rng_seed        | BIGINT       | or VARCHAR for audit (optional)     |
| bonus_round_id  | VARCHAR(64)  | nullable, logical FK                |
| created_at      | TIMESTAMPTZ  |                                     |

### balances

| Column     | Type         | Description        |
|------------|--------------|--------------------|
| id         | BIGSERIAL    | PK                 |
| user_id    | BIGINT       | FK → users.id UNIQUE per (user_id, currency) |
| currency   | CHAR(3)      |                    |
| amount     | NUMERIC(18,4)| current balance    |
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
| total_spins      | INTEGER      | scheduled count (e.g. 10)     |
| spins_played     | INTEGER      | default 0                      |
| total_win        | NUMERIC(18,4)| accumulated win in the bonus   |
| config           | JSONB        | multiplier, reel set, etc.     |
| created_at       | TIMESTAMPTZ  |                                |
| completed_at     | TIMESTAMPTZ  | nullable                       |

### transactions

Immutable ledger of balance movements (bet, win, deposit, bonus, admin).

| Column       | Type         | Description                    |
|--------------|--------------|--------------------------------|
| id           | BIGSERIAL    | PK                             |
| transaction_id | VARCHAR(64) | UNIQUE                         |
| user_id      | BIGINT       | FK → users.id                  |
| type         | VARCHAR(32)  | bet, win, deposit, withdrawal, bonus, adjustment |
| amount       | NUMERIC(18,4)| positive = credit              |
| currency     | CHAR(3)      |                                |
| balance_after| NUMERIC(18,4)| balance after the operation    |
| reference_type | VARCHAR(32) | spin, bonus_round, deposit_id  |
| reference_id | VARCHAR(64)  | spin_id, bonus_round_id, etc.  |
| created_at   | TIMESTAMPTZ  |                                |
| metadata     | JSONB        | optional                       |

---

### Indexes (recommended)

- `spins(user_id, created_at)`, `spins(session_id, created_at)`, `spins(game_id, created_at)` — history and reports.
- `transactions(user_id, created_at)` — account statement.
- `bonus_rounds(session_id, status)` — active bonus lookup.
- `sessions(user_id, status)`, `sessions(session_id)`.

---

*This document can be used as a reference for backend slot development and client integration.*
