# SlotsOne -- Test Case Matrix

**Document ID:** QA-TCM-001
**Version:** 1.0
**Author:** QA Engineering
**Last Updated:** 2026-03-05
**Total Test Cases:** 198
**Platform Under Test:** SlotsOne iGaming Platform (REST API)

---

## Table of Contents

1. [Authentication Module](#1-authentication-module)
2. [Slots Game Module](#2-slots-game-module)
3. [European Roulette Module](#3-european-roulette-module)
4. [American Roulette Module](#4-american-roulette-module)
5. [Provably Fair Module](#5-provably-fair-module)
6. [Session & Rate Limiting](#6-session--rate-limiting)
7. [Wallet & Balance](#7-wallet--balance)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)

**Legend -- Priority:** P0 = Blocker, P1 = Critical, P2 = Major, P3 = Minor
**Legend -- Type:** EP = Equivalence Partitioning, BVA = Boundary Value Analysis, DT = Decision Table, ST = State Transition, NEG = Negative, SEC = Security, COMB = Combinatorial

---

## 1. Authentication Module

### 1.1 Registration (POST /api/v1/auth/register)

Schema: `{ email: string (email format), password: string (min 8 chars) }` -- strict mode (no extra fields).
Response: `201 { access_token, token_type: "Bearer", expires_in: 900 }` + `Set-Cookie: refresh_token` (httpOnly, 7-day TTL).

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-AUTH-001 | Valid registration with correct email and password | `{ "email": "player@example.com", "password": "securePass1" }` | 201, response contains `access_token`, `token_type: "Bearer"`, `expires_in: 900`; `Set-Cookie` header contains `refresh_token` with `HttpOnly` flag | P0 | EP |
| TC-AUTH-002 | Duplicate email registration | Register same email twice | First: 201; Second: 409 `{ error: "Email already registered", code: "email_taken" }` | P0 | EP |
| TC-AUTH-003 | Invalid email format -- missing @ | `{ "email": "playerexample.com", "password": "password123" }` | 400 `{ error: "Invalid request", code: "invalid_body" }` | P1 | EP |
| TC-AUTH-004 | Password too short (7 chars) | `{ "email": "a@b.com", "password": "1234567" }` | 400 `{ error: "Invalid request", code: "invalid_body" }` | P1 | BVA |
| TC-AUTH-005 | Password exactly 8 chars (lower boundary) | `{ "email": "a@b.com", "password": "12345678" }` | 201 success | P1 | BVA |
| TC-AUTH-006 | Password 9 chars (above boundary) | `{ "email": "a@b.com", "password": "123456789" }` | 201 success | P2 | BVA |
| TC-AUTH-007 | Empty email field | `{ "email": "", "password": "password123" }` | 400 `invalid_body` | P1 | NEG |
| TC-AUTH-008 | Empty password field | `{ "email": "a@b.com", "password": "" }` | 400 `invalid_body` | P1 | NEG |
| TC-AUTH-009 | Missing email field entirely | `{ "password": "password123" }` | 400 `invalid_body` | P1 | NEG |
| TC-AUTH-010 | Missing password field entirely | `{ "email": "a@b.com" }` | 400 `invalid_body` | P1 | NEG |
| TC-AUTH-011 | SQL injection in email field | `{ "email": "'; DROP TABLE users;--@x.com", "password": "password123" }` | 400 `invalid_body` (Zod email validation rejects) or 201 with input sanitized; no SQL execution | P0 | SEC |
| TC-AUTH-012 | XSS payload in email field | `{ "email": "<script>alert(1)</script>@x.com", "password": "password123" }` | 400 `invalid_body` (not valid email format) | P1 | SEC |
| TC-AUTH-013 | Very long email (256 chars) | email = `"a" * 243 + "@example.com"` (256 total) | 400 or 201 depending on DB constraint; no crash | P2 | BVA |
| TC-AUTH-014 | Unicode characters in password | `{ "email": "a@b.com", "password": "p@ssw\u00f6rd!!" }` | 201 success (scrypt handles unicode) | P2 | EP |
| TC-AUTH-015 | Extra fields in request body (strict mode) | `{ "email": "a@b.com", "password": "password123", "role": "admin" }` | 400 `invalid_body` (Zod strict rejects unknown keys) | P1 | SEC |
| TC-AUTH-016 | Empty request body | `{}` | 400 `invalid_body` | P1 | NEG |
| TC-AUTH-017 | Null request body | `null` / no Content-Type | 400 `invalid_body` | P2 | NEG |
| TC-AUTH-018 | Email with leading/trailing spaces | `{ "email": "  a@b.com  ", "password": "password123" }` | 400 (spaces make email invalid per Zod) or 201 if trimmed | P3 | EP |
| TC-AUTH-019 | Case-insensitive email duplicate | Register "A@B.COM" then "a@b.com" | Behavior depends on DB collation; document actual result | P2 | EP |
| TC-AUTH-020 | Verify access token is valid RS256 JWT | Decode returned `access_token` | Header `alg: RS256`, payload `sub` is UUID, `exp` is ~900s from now | P0 | EP |

### 1.2 Login (POST /api/v1/auth/login)

Schema: identical to register -- `{ email: string (email), password: string (min 8) }` strict.
Response: `200 { access_token, token_type: "Bearer", expires_in: 900 }` + `Set-Cookie: refresh_token`.

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-AUTH-021 | Valid login with correct credentials | Pre-registered email + correct password | 200, valid `access_token`, `token_type: "Bearer"`, `expires_in: 900` | P0 | EP |
| TC-AUTH-022 | Wrong password | Correct email, wrong password | 401 `{ error: "Invalid credentials", code: "invalid_credentials" }` | P0 | EP |
| TC-AUTH-023 | Non-existent email | Unregistered email | 401 `invalid_credentials` (same error as wrong password -- no user enumeration) | P0 | SEC |
| TC-AUTH-024 | Empty email | `{ "email": "", "password": "password123" }` | 400 `invalid_body` | P1 | NEG |
| TC-AUTH-025 | Empty password | `{ "email": "a@b.com", "password": "" }` | 400 `invalid_body` | P1 | NEG |
| TC-AUTH-026 | Missing email field | `{ "password": "password123" }` | 400 `invalid_body` | P1 | NEG |
| TC-AUTH-027 | Missing body | No JSON body | 400 `invalid_body` | P1 | NEG |
| TC-AUTH-028 | Login returns refresh token cookie | Valid login | `Set-Cookie` header present with `refresh_token`, `HttpOnly`, `Path=/api/v1/auth` | P0 | EP |
| TC-AUTH-029 | Timing-safe credential check | Wrong password vs non-existent email | Response times should be similar (no timing oracle) | P2 | SEC |

### 1.3 Token Refresh (POST /api/v1/auth/refresh)

Reads `refresh_token` from cookie. Single-use rotation: consumes old token, issues new access + refresh pair.

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-AUTH-030 | Valid token refresh | Valid `refresh_token` cookie | 200, new `access_token`, new `Set-Cookie` with rotated refresh token | P0 | ST |
| TC-AUTH-031 | Missing refresh token cookie | No cookie sent | 401 `{ code: "missing_refresh_token" }` | P0 | NEG |
| TC-AUTH-032 | Reuse consumed refresh token | Use same refresh token twice | First: 200; Second: 401 `{ code: "invalid_refresh_token" }` (rotation invalidated it) | P0 | SEC |
| TC-AUTH-033 | Expired refresh token (>7 days) | Token older than 7 days | 401 `invalid_refresh_token`; `Set-Cookie` clears the cookie | P1 | ST |
| TC-AUTH-034 | Forged/garbage refresh token | Random hex string as cookie | 401 `invalid_refresh_token` | P1 | SEC |
| TC-AUTH-035 | Refresh after logout (all tokens revoked) | Logout then attempt refresh | 401 `invalid_refresh_token` | P1 | ST |

### 1.4 Logout (POST /api/v1/auth/logout)

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-AUTH-036 | Valid logout | Valid refresh token cookie | 204 No Content; `Set-Cookie` clears `refresh_token`; all user refresh tokens revoked | P0 | ST |
| TC-AUTH-037 | Logout without cookie | No cookie | 204 (idempotent, no error) | P2 | EP |
| TC-AUTH-038 | Logout with invalid cookie | Garbage cookie value | 204 (gracefully handles, clears cookie) | P2 | NEG |

### 1.5 Auth State Transition Diagram

```
[Unauthenticated] --register--> [Authenticated: access + refresh]
[Unauthenticated] --login-----> [Authenticated: access + refresh]
[Authenticated]   --refresh---> [Authenticated: new access + new refresh]
[Authenticated]   --logout----> [Unauthenticated: all refresh tokens revoked]
[Authenticated]   --token exp-> [Access Expired: refresh still valid]
[Access Expired]  --refresh---> [Authenticated: new access + new refresh]
[Access Expired]  --7 days----> [Fully Expired: must login again]
```

---

## 2. Slots Game Module

### 2.1 Game Init (POST /api/v1/game/init)

Requires: `Authorization: Bearer <JWT>`. Optional body: `{ game_id?, platform?, locale?, client_version? }` (strict).
Returns: session_id, game_id, config, balance, idle_matrix (5x3), expires_at.

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-SLOT-001 | Valid init with default game_id | `{}` (empty body) | 200, `game_id: "slot_mega_fortune_001"`, config with reels=5, rows=3, paylines=20, min_bet=0.1, max_bet=100 | P0 | EP |
| TC-SLOT-002 | Valid init with explicit game_id | `{ "game_id": "slot_mega_fortune_001" }` | 200, same as above | P1 | EP |
| TC-SLOT-003 | Init with unknown game_id | `{ "game_id": "nonexistent_game" }` | 200 with session created for that game_id (game_id is passthrough) | P2 | EP |
| TC-SLOT-004 | Init without auth header | No `Authorization` header | 401 `{ code: "missing_token" }` | P0 | NEG |
| TC-SLOT-005 | Init with expired JWT | Expired token | 401 `{ code: "token_expired" }` | P0 | ST |
| TC-SLOT-006 | Init returns valid session expiry | Valid request | `expires_at` is ISO 8601, approximately 1 hour from now | P1 | EP |
| TC-SLOT-007 | Init returns correct balance | Valid request | `balance.amount` reflects user wallet (default $1000 for new users), `currency: "USD"` | P0 | EP |
| TC-SLOT-008 | Init returns 5x3 idle_matrix | Valid request | `idle_matrix` is array of 5 arrays, each with 3 string elements from symbol set | P1 | EP |
| TC-SLOT-009 | Init returns paytable in config | Valid request | `config.paytable` contains `line_wins`, `scatter`, `wild` | P1 | EP |
| TC-SLOT-010 | Extra fields in body rejected | `{ "game_id": "x", "hack": true }` | 400 `invalid_body` (strict schema) | P1 | SEC |

### 2.2 Spin (POST /api/v1/spin)

Schema: `{ session_id: string, game_id: string, bet: { amount: number, currency: string, lines: int }, client_timestamp: int }` (strict).
Constraints: bet.amount in [0.1, 100], lines in [1, 20], currency = "USD".

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-SLOT-011 | Valid spin with minimum bet | amount=0.1, lines=1, currency="USD" | 200, spin_id (UUID), outcome with reel_matrix, balance updated | P0 | BVA |
| TC-SLOT-012 | Valid spin with maximum bet | amount=100, lines=20, currency="USD" | 200 success | P0 | BVA |
| TC-SLOT-013 | Bet below minimum (0.09) | amount=0.09, lines=1, currency="USD" | 422 `{ code: "invalid_bet" }` | P0 | BVA |
| TC-SLOT-014 | Bet above maximum (100.01) | amount=100.01, lines=1, currency="USD" | 422 `{ code: "invalid_bet" }` | P0 | BVA |
| TC-SLOT-015 | Negative bet amount (-1) | amount=-1 | 400 `{ code: "invalid_bet" }` | P1 | NEG |
| TC-SLOT-016 | Zero bet amount | amount=0 | 422 `{ code: "invalid_bet" }` (below min_bet 0.1) | P1 | BVA |
| TC-SLOT-017 | Valid lines = 1 (minimum) | lines=1 | 200 success | P1 | BVA |
| TC-SLOT-018 | Valid lines = 20 (maximum) | lines=20 | 200 success | P1 | BVA |
| TC-SLOT-019 | Invalid lines = 0 | lines=0 | 422 `{ code: "invalid_lines" }` | P1 | BVA |
| TC-SLOT-020 | Invalid lines = 21 | lines=21 | 422 `{ code: "invalid_lines" }` | P1 | BVA |
| TC-SLOT-021 | Non-integer lines (1.5) | lines=1.5 | 400 `invalid_body` (Zod int() validation) | P2 | NEG |
| TC-SLOT-022 | Invalid currency (EUR) | currency="EUR" | 422 `{ code: "invalid_currency" }` | P1 | EP |
| TC-SLOT-023 | Empty currency | currency="" | 400 `invalid_body` (Zod min(1) validation) | P2 | NEG |
| TC-SLOT-024 | Insufficient balance | Bet more than wallet balance | 422 `{ code: "insufficient_balance" }` | P0 | EP |
| TC-SLOT-025 | Expired session | Use session_id older than 1 hour | 403 `{ code: "session_expired" }` | P0 | ST |
| TC-SLOT-026 | Non-existent session_id | Random session_id | 403 `{ code: "session_expired" }` | P1 | NEG |
| TC-SLOT-027 | Session owned by different user | User A's session_id with User B's JWT | 403 `{ code: "forbidden" }` | P0 | SEC |
| TC-SLOT-028 | Wrong game_id for session | Init with game A, spin with game B | 400 `{ code: "invalid_game_id" }` | P1 | EP |
| TC-SLOT-029 | Spin returns 5x3 reel matrix | Valid spin | `outcome.reel_matrix` is 5 arrays of 3 symbols each | P0 | EP |
| TC-SLOT-030 | Win breakdown accuracy | Spin resulting in a win | `outcome.win.breakdown` items have `type: "line"`, `line_index`, `symbol`, `count`, `payout` | P0 | EP |
| TC-SLOT-031 | Balance decreases by bet on loss | No-win spin | `balance.amount = previous_balance - bet_amount` | P0 | EP |
| TC-SLOT-032 | Balance reflects net on win | Winning spin | `balance.amount = previous_balance - bet_amount + win_amount` | P0 | EP |
| TC-SLOT-033 | Bonus trigger returns free_spins state | 3+ scatters on reels | `next_state: "free_spins"`, `outcome.bonus_triggered` is non-null | P1 | EP |
| TC-SLOT-034 | Non-bonus spin returns base_game | Normal spin | `next_state: "base_game"`, `outcome.bonus_triggered: null` | P1 | EP |

### 2.3 Slots Bet Decision Table

| TC-ID | Amount | Lines | Currency | Expected | Reason |
|-------|--------|-------|----------|----------|--------|
| TC-SLOT-035 | 0.1 | 1 | USD | Valid | Min bet, min lines |
| TC-SLOT-036 | 0.1 | 20 | USD | Valid | Min bet, max lines |
| TC-SLOT-037 | 100 | 1 | USD | Valid | Max bet, min lines |
| TC-SLOT-038 | 100 | 20 | USD | Valid | Max bet, max lines |
| TC-SLOT-039 | 0.09 | 10 | USD | Invalid | Below min bet |
| TC-SLOT-040 | 100.01 | 10 | USD | Invalid | Above max bet |
| TC-SLOT-041 | 1.00 | 0 | USD | Invalid | Below min lines |
| TC-SLOT-042 | 1.00 | 21 | USD | Invalid | Above max lines |
| TC-SLOT-043 | 1.00 | 10 | EUR | Invalid | Wrong currency |
| TC-SLOT-044 | -5.00 | 10 | USD | Invalid | Negative amount |

---

## 3. European Roulette Module

Game ID: `roulette_european_001`. 37 pockets (0-36). La Partage rule on 0 for even-money bets.

### 3.1 Roulette Init (POST /api/v1/roulette/init)

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-ROUL-001 | Valid European roulette init | Valid JWT, POST | 200, `game_id: "roulette_european_001"`, config with variant="european", numbers=37 | P0 | EP |
| TC-ROUL-002 | Config includes all bet types | Valid init | `config.bet_types` contains: straight, split, street, trio, corner, basket, sixLine, column, dozen, red, black, even, odd, high, low | P0 | EP |
| TC-ROUL-003 | Config includes La Partage feature | Valid init | `config.features` includes `"la_partage"` | P1 | EP |
| TC-ROUL-004 | Recent numbers in response | Valid init | `recent_numbers` is array of integers (0-36), max 20 items | P2 | EP |
| TC-ROUL-005 | Wheel order has 37 entries | Valid init | `config.wheel_order` length = 37, contains 0-36 exactly once | P1 | EP |
| TC-ROUL-006 | Init without auth | No Authorization header | 401 | P0 | NEG |

### 3.2 Bet Validation Matrix (POST /api/v1/roulette/spin)

Schema: `{ session_id, game_id?, bets: [{ type, numbers, amount }], client_timestamp? }` -- max 200 bets.
Constraints: min_bet=0.10 per bet, max_total_bet=2000, per-type max bets vary.

#### 3.2.1 Straight Bets (single number, payout 35:1, maxBet 100)

| TC-ID | Bet Type | Numbers | Amount | Expected | Notes |
|-------|----------|---------|--------|----------|-------|
| TC-ROUL-007 | straight | [17] | 1.00 | Valid | Single number 1-36 |
| TC-ROUL-008 | straight | [0] | 1.00 | Valid | Zero is valid |
| TC-ROUL-009 | straight | [37] | 1.00 | Invalid | Number > 36 |
| TC-ROUL-010 | straight | [-1] | 1.00 | Invalid | Negative number (European has no 00) |
| TC-ROUL-011 | straight | [17, 18] | 1.00 | Invalid | Too many numbers for straight (expect 1) |
| TC-ROUL-012 | straight | [] | 1.00 | Invalid | Empty numbers array |
| TC-ROUL-013 | straight | [5] | 0.10 | Valid | Minimum bet boundary |
| TC-ROUL-014 | straight | [5] | 0.09 | Invalid | Below minimum bet |
| TC-ROUL-015 | straight | [5] | 100.00 | Valid | At per-type max |
| TC-ROUL-016 | straight | [5] | 100.01 | Invalid | Above per-type max |

#### 3.2.2 Split Bets (2 adjacent numbers, payout 17:1, maxBet 200)

| TC-ID | Bet Type | Numbers | Amount | Expected | Notes |
|-------|----------|---------|--------|----------|-------|
| TC-ROUL-017 | split | [1, 2] | 1.00 | Valid | Vertically adjacent (same column in table layout) |
| TC-ROUL-018 | split | [1, 4] | 1.00 | Valid | Horizontally adjacent |
| TC-ROUL-019 | split | [1, 3] | 1.00 | Invalid | Non-adjacent: 1 and 3 are not neighbors |
| TC-ROUL-020 | split | [0, 1] | 1.00 | Valid | 0 is adjacent to 1, 2, 3 |
| TC-ROUL-021 | split | [0, 2] | 1.00 | Valid | 0 is adjacent to 2 |
| TC-ROUL-022 | split | [0, 3] | 1.00 | Valid | 0 is adjacent to 3 |
| TC-ROUL-023 | split | [0, 4] | 1.00 | Invalid | 0 is not adjacent to 4 |
| TC-ROUL-024 | split | [1, 1] | 1.00 | Invalid | Duplicate numbers |
| TC-ROUL-025 | split | [35, 36] | 1.00 | Valid | Adjacent at table edge |

#### 3.2.3 Street Bets (3-number column group, payout 11:1, maxBet 300)

| TC-ID | Bet Type | Numbers | Amount | Expected | Notes |
|-------|----------|---------|--------|----------|-------|
| TC-ROUL-026 | street | [1, 2, 3] | 1.00 | Valid | First street (column 0 of TABLE_ROWS) |
| TC-ROUL-027 | street | [4, 5, 6] | 1.00 | Valid | Second street |
| TC-ROUL-028 | street | [34, 35, 36] | 1.00 | Valid | Last street |
| TC-ROUL-029 | street | [1, 2, 4] | 1.00 | Invalid | Not a valid column group |
| TC-ROUL-030 | street | [1, 2] | 1.00 | Invalid | Only 2 numbers (expected 3) |

#### 3.2.4 Trio Bets (3 numbers including 0, payout 11:1, maxBet 300)

| TC-ID | Bet Type | Numbers | Amount | Expected | Notes |
|-------|----------|---------|--------|----------|-------|
| TC-ROUL-031 | trio | [0, 1, 2] | 1.00 | Valid | Allowed trio |
| TC-ROUL-032 | trio | [0, 2, 3] | 1.00 | Valid | Allowed trio |
| TC-ROUL-033 | trio | [1, 2, 3] | 1.00 | Invalid | Not a valid trio (must include 0) |
| TC-ROUL-034 | trio | [0, 1, 3] | 1.00 | Invalid | Not a valid trio combination |

#### 3.2.5 Corner Bets (2x2 block, payout 8:1, maxBet 400)

| TC-ID | Bet Type | Numbers | Amount | Expected | Notes |
|-------|----------|---------|--------|----------|-------|
| TC-ROUL-035 | corner | [1, 2, 4, 5] | 1.00 | Valid | 2x2 block at top-left |
| TC-ROUL-036 | corner | [32, 33, 35, 36] | 1.00 | Valid | 2x2 block at bottom-right |
| TC-ROUL-037 | corner | [1, 2, 3, 4] | 1.00 | Invalid | Not a 2x2 block |
| TC-ROUL-038 | corner | [1, 4, 7, 10] | 1.00 | Invalid | Same row, not a block |

#### 3.2.6 Basket Bet (0,1,2,3, payout 8:1, maxBet 400)

| TC-ID | Bet Type | Numbers | Amount | Expected | Notes |
|-------|----------|---------|--------|----------|-------|
| TC-ROUL-039 | basket | [0, 1, 2, 3] | 1.00 | Valid | Only valid basket |
| TC-ROUL-040 | basket | [0, 1, 2, 4] | 1.00 | Invalid | Wrong combination |

#### 3.2.7 Six Line (6 numbers, 2 adjacent streets, payout 5:1, maxBet 500)

| TC-ID | Bet Type | Numbers | Amount | Expected | Notes |
|-------|----------|---------|--------|----------|-------|
| TC-ROUL-041 | sixLine | [1, 2, 3, 4, 5, 6] | 1.00 | Valid | First two streets |
| TC-ROUL-042 | sixLine | [31, 32, 33, 34, 35, 36] | 1.00 | Valid | Last two streets |
| TC-ROUL-043 | sixLine | [1, 2, 3, 7, 8, 9] | 1.00 | Invalid | Non-adjacent streets |

#### 3.2.8 Column Bets (12 numbers, payout 2:1, maxBet 1000)

| TC-ID | Bet Type | Numbers | Amount | Expected | Notes |
|-------|----------|---------|--------|----------|-------|
| TC-ROUL-044 | column | [1,4,7,10,13,16,19,22,25,28,31,34] | 1.00 | Valid | First column |
| TC-ROUL-045 | column | [2,5,8,11,14,17,20,23,26,29,32,35] | 1.00 | Valid | Second column |
| TC-ROUL-046 | column | [3,6,9,12,15,18,21,24,27,30,33,36] | 1.00 | Valid | Third column |
| TC-ROUL-047 | column | [1,4,7,10,13,16,19,22,25,28,31,35] | 1.00 | Invalid | Mixed column (34 swapped for 35) |

#### 3.2.9 Dozen Bets (12 numbers, payout 2:1, maxBet 1000)

| TC-ID | Bet Type | Numbers | Amount | Expected | Notes |
|-------|----------|---------|--------|----------|-------|
| TC-ROUL-048 | dozen | [1,2,3,4,5,6,7,8,9,10,11,12] | 1.00 | Valid | First dozen |
| TC-ROUL-049 | dozen | [13,14,15,16,17,18,19,20,21,22,23,24] | 1.00 | Valid | Second dozen |
| TC-ROUL-050 | dozen | [25,26,27,28,29,30,31,32,33,34,35,36] | 1.00 | Valid | Third dozen |
| TC-ROUL-051 | dozen | [1,2,3,4,5,6,7,8,9,10,11,13] | 1.00 | Invalid | Mixed dozen |

#### 3.2.10 Even-Money Bets (18 numbers, payout 1:1, maxBet 1000)

| TC-ID | Bet Type | Numbers | Amount | Expected | Notes |
|-------|----------|---------|--------|----------|-------|
| TC-ROUL-052 | red | [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] | 5.00 | Valid | All 18 red numbers |
| TC-ROUL-053 | black | [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35] | 5.00 | Valid | All 18 black numbers |
| TC-ROUL-054 | red | [2,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] | 5.00 | Invalid | Includes 2 (black) instead of 1 |
| TC-ROUL-055 | even | [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36] | 5.00 | Valid | All 18 even numbers |
| TC-ROUL-056 | odd | [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35] | 5.00 | Valid | All 18 odd numbers |
| TC-ROUL-057 | high | [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36] | 5.00 | Valid | 19-36 |
| TC-ROUL-058 | low | [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18] | 5.00 | Valid | 1-18 |

#### 3.2.11 Cross-Cutting Bet Validation

| TC-ID | Test Case | Input | Expected | Notes |
|-------|-----------|-------|----------|-------|
| TC-ROUL-059 | Invalid bet type | `type: "fiveNumber"` | 400 invalid bet type | Non-existent type |
| TC-ROUL-060 | Empty bets array | `bets: []` | 400 "At least one bet required" | Zod min(1) |
| TC-ROUL-061 | Duplicate identical bet | Two straight bets on [17] | 400 "Duplicate bet" | Dedup check |
| TC-ROUL-062 | Total bet exceeds table limit | 21 bets x $100 = $2100 | 400 "Total bet exceeds table limit 2000" | Max total = $2000 |
| TC-ROUL-063 | Total bet at exact limit | 20 bets x $100 = $2000 | Valid | Boundary |
| TC-ROUL-064 | 200 bets (max array) | 200 unique straight bets (only 37 possible) | Invalid (can't have 200 unique straights) | Schema max(200) |
| TC-ROUL-065 | Invalid currency for roulette | currency forced to EUR | 422 `invalid_currency` | Only USD |

### 3.3 Payout Verification (European)

Decision table: Bet Type x Winning Number -> Expected Payout.
Formula: Win = `bet_amount * (multiplier + 1)` on hit; La Partage = `bet_amount / 2` on 0 for even-money.

| TC-ID | Bet Type | Numbers | Bet Amount | Winning # | Expected Payout | Notes |
|-------|----------|---------|------------|-----------|-----------------|-------|
| TC-PAY-001 | straight | [17] | 1.00 | 17 | 36.00 | 35:1 + stake = 36x |
| TC-PAY-002 | straight | [17] | 1.00 | 5 | 0.00 | Loss |
| TC-PAY-003 | straight | [0] | 1.00 | 0 | 36.00 | Straight on 0 wins normally |
| TC-PAY-004 | split | [1, 4] | 2.00 | 4 | 36.00 | 17:1 + stake = 18x; 2.00 * 18 = 36.00 |
| TC-PAY-005 | split | [1, 4] | 2.00 | 5 | 0.00 | Loss |
| TC-PAY-006 | street | [1, 2, 3] | 3.00 | 2 | 36.00 | 11:1 + stake = 12x; 3.00 * 12 = 36.00 |
| TC-PAY-007 | trio | [0, 1, 2] | 1.00 | 0 | 12.00 | 11:1 + stake = 12x |
| TC-PAY-008 | corner | [1,2,4,5] | 4.00 | 5 | 36.00 | 8:1 + stake = 9x; 4.00 * 9 = 36.00 |
| TC-PAY-009 | basket | [0,1,2,3] | 1.00 | 0 | 9.00 | 8:1 + stake = 9x |
| TC-PAY-010 | sixLine | [1,2,3,4,5,6] | 6.00 | 3 | 36.00 | 5:1 + stake = 6x; 6.00 * 6 = 36.00 |
| TC-PAY-011 | column | [1,4,7,...,34] | 10.00 | 7 | 30.00 | 2:1 + stake = 3x; 10.00 * 3 = 30.00 |
| TC-PAY-012 | dozen | [1-12] | 10.00 | 12 | 30.00 | 2:1 + stake = 3x |
| TC-PAY-013 | red | [REDS] | 10.00 | 1 | 20.00 | 1:1 + stake = 2x; win |
| TC-PAY-014 | red | [REDS] | 10.00 | 2 | 0.00 | 2 is black; loss |
| TC-PAY-015 | even | [EVENS] | 10.00 | 8 | 20.00 | Win |
| TC-PAY-016 | odd | [ODDS] | 10.00 | 8 | 0.00 | 8 is even; loss |
| TC-PAY-017 | high | [19-36] | 10.00 | 18 | 0.00 | 18 is low; loss |
| TC-PAY-018 | low | [1-18] | 10.00 | 1 | 20.00 | Win |

### 3.4 La Partage Rule (European Only -- Ball Lands on 0)

When winning_number = 0, all even-money bets receive half their stake back. Non-even-money bets lose normally (unless they cover 0).

| TC-ID | Bet Type | Numbers | Bet Amount | Winning # | Expected Payout | la_partage | Notes |
|-------|----------|---------|------------|-----------|-----------------|------------|-------|
| TC-PAY-019 | red | [REDS] | 10.00 | 0 | 5.00 | true | La Partage: half back |
| TC-PAY-020 | black | [BLACKS] | 10.00 | 0 | 5.00 | true | La Partage: half back |
| TC-PAY-021 | even | [EVENS] | 10.00 | 0 | 5.00 | true | La Partage: half back |
| TC-PAY-022 | odd | [ODDS] | 10.00 | 0 | 5.00 | true | La Partage: half back |
| TC-PAY-023 | high | [19-36] | 10.00 | 0 | 5.00 | true | La Partage: half back |
| TC-PAY-024 | low | [1-18] | 10.00 | 0 | 5.00 | true | La Partage: half back |
| TC-PAY-025 | straight | [5] | 10.00 | 0 | 0.00 | false | Inside bet: no La Partage |
| TC-PAY-026 | column | [1,4,...,34] | 10.00 | 0 | 0.00 | false | Column bet: no La Partage (not even-money) |
| TC-PAY-027 | dozen | [1-12] | 10.00 | 0 | 0.00 | false | Dozen bet: no La Partage |
| TC-PAY-028 | basket | [0,1,2,3] | 1.00 | 0 | 9.00 | false | Covers 0: wins normally, no La Partage |
| TC-PAY-029 | straight | [0] | 1.00 | 0 | 36.00 | false | Straight on 0 wins 35:1 |
| TC-PAY-030 | red + straight on 0 (multi-bet) | red + straight [0] | 10 + 1 | 0 | 5.00 + 36.00 = 41.00 | mixed | Multi-bet: red gets LP, straight on 0 wins |

### 3.5 Announced Bets (European Only)

Announced bets expand into individual component bets. Validated on the server side.

| TC-ID | Announced Bet | Chip Value | Expands To | Total Cost | Notes |
|-------|---------------|------------|------------|------------|-------|
| TC-ROUL-066 | voisins | 1.00 | 7 bets (trio 2x, 5 splits, corner 2x) | 9.00 | Voisins du Zero |
| TC-ROUL-067 | tiers | 1.00 | 6 splits | 6.00 | Tiers du Cylindre |
| TC-ROUL-068 | orphelins | 1.00 | 1 straight + 4 splits | 5.00 | Orphelins a Cheval |
| TC-ROUL-069 | neighbors:2:17 | 1.00 | 5 straight bets (17 +/- 2 on wheel) | 5.00 | Neighbor bet: spread=2 around 17 |
| TC-ROUL-070 | neighbors:0:0 | 1.00 | 1 straight on [0] | 1.00 | Edge: zero spread on 0 |

---

## 4. American Roulette Module

Game ID: `roulette_american_001`. 38 pockets (0, 00 (=-1), 1-36). No La Partage. RTP: 94.74%.

### 4.1 Key Differences from European

| Aspect | European | American |
|--------|----------|----------|
| Pockets | 37 (0-36) | 38 (0, 00, 1-36) |
| 00 representation | N/A | -1 in API |
| La Partage | Yes (on 0) | No |
| Trio bet | Yes ([0,1,2] or [0,2,3]) | No |
| Basket bet | Yes ([0,1,2,3]) | No |
| Top Line bet | No | Yes ([0,-1,1,2,3], payout 6:1) |
| RTP | 97.3% | 94.74% |
| House edge | 2.7% | 5.26% |

### 4.2 American Roulette Init (POST /api/v1/american-roulette/init)

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-AROUL-001 | Valid American roulette init | Valid JWT | 200, `game_id: "roulette_american_001"`, variant="american", numbers=38 | P0 | EP |
| TC-AROUL-002 | Config includes topLine bet type | Valid init | `config.bet_types` contains `topLine` with payout=6, size=5 | P0 | EP |
| TC-AROUL-003 | Config does NOT include trio or basket | Valid init | `config.bet_types` does not contain `trio` or `basket` | P1 | EP |
| TC-AROUL-004 | Config includes double_zero = -1 | Valid init | `config.double_zero = -1` | P1 | EP |
| TC-AROUL-005 | Wheel order has 38 entries | Valid init | `config.wheel_order` length = 38 | P1 | EP |
| TC-AROUL-006 | Config features include top_line | Valid init | `config.features` includes `"top_line"` | P2 | EP |

### 4.3 American-Specific Bet Validation

| TC-ID | Bet Type | Numbers | Amount | Expected | Notes |
|-------|----------|---------|--------|----------|-------|
| TC-AROUL-007 | straight | [-1] | 1.00 | Valid | 00 pocket (represented as -1) |
| TC-AROUL-008 | straight | [0] | 1.00 | Valid | 0 pocket |
| TC-AROUL-009 | straight | [37] | 1.00 | Invalid | Number > 36 |
| TC-AROUL-010 | straight | [-2] | 1.00 | Invalid | Only -1 (00) is valid negative |
| TC-AROUL-011 | split | [0, -1] | 1.00 | Valid | 0 and 00 are adjacent |
| TC-AROUL-012 | split | [-1, 1] | 1.00 | Valid | 00 adjacent to 1 |
| TC-AROUL-013 | split | [-1, 2] | 1.00 | Valid | 00 adjacent to 2 |
| TC-AROUL-014 | split | [-1, 3] | 1.00 | Valid | 00 adjacent to 3 |
| TC-AROUL-015 | split | [-1, 4] | 1.00 | Invalid | 00 not adjacent to 4 |
| TC-AROUL-016 | topLine | [0, -1, 1, 2, 3] | 5.00 | Valid | Unique American bet: 0, 00, 1, 2, 3 |
| TC-AROUL-017 | topLine | [0, 1, 2, 3, 4] | 5.00 | Invalid | Missing 00, has 4 instead |
| TC-AROUL-018 | topLine | [-1, 0, 1, 2, 3] | 5.00 | Valid | Same as TC-AROUL-016 (order irrelevant) |
| TC-AROUL-019 | trio | [0, 1, 2] | 1.00 | Invalid | Trio not available in American roulette |
| TC-AROUL-020 | basket | [0, 1, 2, 3] | 1.00 | Invalid | Basket not available in American roulette |
| TC-AROUL-021 | street | [1, 2, 3] | 1.00 | Valid | Streets work same as European |
| TC-AROUL-022 | corner | [1, 2, 4, 5] | 1.00 | Valid | Corners work same as European |

### 4.4 American Roulette Payout Verification

| TC-ID | Bet Type | Numbers | Bet Amount | Winning # | Display | Expected Payout | Notes |
|-------|----------|---------|------------|-----------|---------|-----------------|-------|
| TC-AROUL-023 | straight | [-1] | 1.00 | -1 | "00" | 36.00 | 35:1 on 00 |
| TC-AROUL-024 | straight | [0] | 1.00 | 0 | "0" | 36.00 | 35:1 on 0 |
| TC-AROUL-025 | topLine | [0,-1,1,2,3] | 1.00 | -1 | "00" | 7.00 | 6:1 + stake = 7x |
| TC-AROUL-026 | topLine | [0,-1,1,2,3] | 1.00 | 0 | "0" | 7.00 | 6:1 on 0 |
| TC-AROUL-027 | topLine | [0,-1,1,2,3] | 1.00 | 5 | "5" | 0.00 | Loss |
| TC-AROUL-028 | split | [0, -1] | 2.00 | -1 | "00" | 36.00 | 17:1 + stake on 00 |
| TC-AROUL-029 | red | [REDS] | 10.00 | 0 | "0" | 0.00 | No La Partage: full loss on 0 |
| TC-AROUL-030 | red | [REDS] | 10.00 | -1 | "00" | 0.00 | No La Partage: full loss on 00 |
| TC-AROUL-031 | black | [BLACKS] | 10.00 | -1 | "00" | 0.00 | No La Partage on 00 |
| TC-AROUL-032 | even | [EVENS] | 10.00 | 0 | "0" | 0.00 | No La Partage |
| TC-AROUL-033 | odd | [ODDS] | 10.00 | -1 | "00" | 0.00 | No La Partage |
| TC-AROUL-034 | high | [19-36] | 10.00 | 0 | "0" | 0.00 | No La Partage |
| TC-AROUL-035 | low | [1-18] | 10.00 | -1 | "00" | 0.00 | No La Partage |

### 4.5 Display Value for 00

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-AROUL-036 | winning_number_display for 00 | Ball lands on 00 | `winning_number: -1`, `winning_number_display: "00"` | P0 | EP |
| TC-AROUL-037 | winning_number_display for 0 | Ball lands on 0 | `winning_number: 0`, `winning_number_display: "0"` | P1 | EP |
| TC-AROUL-038 | winning_number_display for regular | Ball lands on 17 | `winning_number: 17`, `winning_number_display: "17"` | P1 | EP |
| TC-AROUL-039 | winning_color for 00 | Ball lands on 00 | `winning_color: "green"` | P1 | EP |
| TC-AROUL-040 | winning_color for 0 | Ball lands on 0 | `winning_color: "green"` | P1 | EP |

---

## 5. Provably Fair Module

Mechanism: HMAC-SHA256(server_seed, `client_seed:nonce`) -> first 4 bytes as uint32 -> used as RNG seed.
Server seed hash = SHA-256(server_seed). Hash is committed before play; seed revealed after rotation.

### 5.1 Seed Management

| TC-ID | Test Case | Endpoint | Input | Expected Result | Priority | Type |
|-------|-----------|----------|-------|-----------------|----------|------|
| TC-PF-001 | Get current seed pair | GET /api/v1/provably-fair/current | Valid JWT | 200: `seed_pair_id`, `server_seed_hash` (64 hex), `client_seed`, `nonce`, `active: true` | P0 | EP |
| TC-PF-002 | Server seed is NOT revealed for active pair | GET /api/v1/provably-fair/current | Valid JWT | Response does NOT contain `server_seed` field | P0 | SEC |
| TC-PF-003 | Set client seed | PUT /api/v1/provably-fair/client-seed | `{ "client_seed": "my_custom_seed" }` | 200: `client_seed: "my_custom_seed"` | P0 | EP |
| TC-PF-004 | Set empty client seed | PUT /api/v1/provably-fair/client-seed | `{ "client_seed": "" }` | 400 `invalid_body` (min length 1) | P1 | BVA |
| TC-PF-005 | Client seed too long (65 chars) | PUT /api/v1/provably-fair/client-seed | 65-char string | 400 `invalid_body` (max 64) | P1 | BVA |
| TC-PF-006 | Client seed exactly 64 chars | PUT /api/v1/provably-fair/client-seed | 64-char string | 200 success | P1 | BVA |
| TC-PF-007 | Client seed exactly 1 char | PUT /api/v1/provably-fair/client-seed | `{ "client_seed": "x" }` | 200 success | P2 | BVA |
| TC-PF-008 | Rotate seed pair | POST /api/v1/provably-fair/rotate | Valid JWT | 200: `previous` contains revealed `server_seed`; `current` contains new `server_seed_hash` | P0 | ST |
| TC-PF-009 | First rotation (no previous pair) | POST /api/v1/provably-fair/rotate | New user's first rotation | 200: `previous: null`, `current` has new pair | P1 | ST |
| TC-PF-010 | Nonce increments per spin | Spin twice, then check | Nonce should be 2 after two spins | P1 | ST |
| TC-PF-011 | Nonce resets on rotation | Rotate, then check current | New pair starts with `nonce: 0` | P1 | ST |

### 5.2 Verification Flow

| TC-ID | Test Case | Steps | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-PF-012 | Verify server seed hash matches | 1. Get `server_seed_hash` before play. 2. Rotate to reveal `server_seed`. 3. Compute SHA-256(server_seed) | Computed hash === committed `server_seed_hash` | P0 | EP |
| TC-PF-013 | Verify HMAC outcome reproducibility | 1. Rotate to get revealed seed. 2. Compute HMAC-SHA256(server_seed, "client_seed:nonce"). 3. Read first 4 bytes as uint32 | Derived seed matches the RNG seed used for that spin's outcome | P0 | EP |
| TC-PF-014 | Round detail includes provably_fair | GET /api/v1/history/:roundId | `provably_fair` object present with `seed_pair_id`, `server_seed_hash`, `client_seed`, `nonce` | P0 | EP |
| TC-PF-015 | Revealed pair shows server_seed | GET round detail for a round whose seed pair was rotated | `provably_fair.server_seed` is non-null, `provably_fair.revealed: true` | P0 | ST |
| TC-PF-016 | Active pair hides server_seed | GET round detail for a round whose seed pair is still active | `provably_fair.server_seed: null`, `provably_fair.revealed: false` | P0 | SEC |
| TC-PF-017 | No auth on provably fair endpoints | No Authorization header | 401 | P1 | NEG |

### 5.3 Provably Fair State Transition

```
[No Seed Pair] --first request--> [Active Pair: hash committed, nonce=0]
[Active Pair]  --spin-----------> [Active Pair: nonce incremented]
[Active Pair]  --set client seed> [Active Pair: client_seed updated]
[Active Pair]  --rotate---------> [Revealed Pair (prev)] + [New Active Pair (current)]
[Revealed Pair] -- immutable, server_seed visible in round detail -->
```

---

## 6. Session & Rate Limiting

### 6.1 Session Lifecycle

Session TTL: 1 hour (3,600,000 ms). Format: `sess_<12-char-UUID-prefix>`.

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-SESS-001 | Session created on init | POST /game/init | `session_id` returned, format `sess_*` | P0 | ST |
| TC-SESS-002 | Session valid within TTL | Spin immediately after init | 200 success | P0 | ST |
| TC-SESS-003 | Session expired after 1 hour | Spin with session > 1hr old | 403 `session_expired` | P0 | ST |
| TC-SESS-004 | Multiple sessions per user | Init twice | Two distinct session_ids, both valid | P1 | EP |
| TC-SESS-005 | Session game_id mismatch | Init slot session, spin as roulette | 400 `invalid_game_id` | P1 | DT |
| TC-SESS-006 | Session owned by wrong user | User A session, User B spin | 403 `forbidden` | P0 | SEC |

Session state transition:

```
[None] --init--> [Active] --spin--> [Active (used)]
[Active] --1hr--> [Expired] --spin--> 403 session_expired
[Active] --cleanup--> [Removed]
```

### 6.2 Rate Limiting

Limit: 5 spins per second per user. Atomic upsert with 1-second sliding window.

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-RATE-001 | 5 spins in 1 second -- all pass | 5 rapid spin requests | All return 200 | P0 | BVA |
| TC-RATE-002 | 6th spin in 1 second -- rate limited | 6 rapid spin requests | First 5: 200; 6th: 429 `Too many requests` with `Retry-After` header | P0 | BVA |
| TC-RATE-003 | Retry-After header value | 6th rapid request | `Retry-After` header present, value >= 1 second | P1 | EP |
| TC-RATE-004 | Rate limit resets after window | Wait 1 second after hitting limit, then spin | 200 success | P1 | ST |
| TC-RATE-005 | Rate limit per user isolation | User A at limit, User B spins | User B unaffected | P1 | EP |
| TC-RATE-006 | Roulette shares rate limit | Mix slot and roulette spins | Total across both counts toward 5/sec limit | P2 | COMB |

### 6.3 Idempotency (Idempotency-Key Header)

TTL: 24 hours. Scope: per-user (key combined with userId).

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-IDEMP-001 | First request with key | `Idempotency-Key: abc123`, valid spin | 200, spin executed, result cached | P0 | EP |
| TC-IDEMP-002 | Replay same key + same payload | Same key + identical body | 200, identical cached response returned (no new spin) | P0 | EP |
| TC-IDEMP-003 | Same key, different payload | Same key, different bet amount | 409 `{ code: "idempotency_key_reused" }` | P0 | EP |
| TC-IDEMP-004 | No idempotency key | No header | 200, always executes new spin | P1 | EP |
| TC-IDEMP-005 | Expired idempotency key (>24h) | Replay after 24 hours | Treated as new request (old key expired) | P2 | ST |
| TC-IDEMP-006 | Cross-user key isolation | User A key "x", User B key "x" | Both execute independently | P1 | SEC |
| TC-IDEMP-007 | Roulette idempotency | Same key for roulette spin | Same behavior as slots idempotency | P1 | EP |

---

## 7. Wallet & Balance

Money stored as BIGINT cents in PostgreSQL. Converted to float at API boundary (`/ 100`). Optimistic locking via `version` column on debit.

### 7.1 Balance Operations

| TC-ID | Test Case | Scenario | Expected Result | Priority | Type |
|-------|-----------|----------|-----------------|----------|------|
| TC-WAL-001 | Default balance for new user | Register new user, init game | `balance.amount: 1000.00`, `currency: "USD"` | P0 | EP |
| TC-WAL-002 | Balance decreases on bet (loss) | Bet $1.00, no win | balance_after = balance_before - 1.00 | P0 | EP |
| TC-WAL-003 | Balance net on win | Bet $1.00, win $5.00 | balance_after = balance_before - 1.00 + 5.00 | P0 | EP |
| TC-WAL-004 | Balance exactly zero after bet | Balance = $1.00, bet $1.00 (loss) | balance_after = 0.00, next spin returns insufficient_balance | P0 | BVA |
| TC-WAL-005 | Insufficient balance | Balance = $0.50, bet $1.00 | 422 `insufficient_balance` | P0 | EP |
| TC-WAL-006 | Optimistic locking on concurrent debit | Two simultaneous spins, only enough for one | One succeeds, one returns `insufficient_balance` | P0 | COMB |
| TC-WAL-007 | Balance precision (cents) | Bet $0.10, win $0.33 | Amounts rounded to 2 decimal places at API boundary | P1 | EP |
| TC-WAL-008 | Large win does not overflow | Win $99,999.99 | Balance reflects correctly; no integer overflow in BIGINT | P2 | BVA |

### 7.2 Transaction Records

| TC-ID | Test Case | Scenario | Expected Result | Priority | Type |
|-------|-----------|----------|-----------------|----------|------|
| TC-WAL-009 | Bet creates debit transaction | Any spin | Round detail shows transaction type="bet", negative/positive amount | P1 | EP |
| TC-WAL-010 | Win creates credit transaction | Winning spin | Round detail shows transaction type="win" | P1 | EP |
| TC-WAL-011 | Loss has only bet transaction | Losing spin | Only one transaction (bet); no win transaction | P1 | EP |
| TC-WAL-012 | balance_before and balance_after in round detail | GET /history/:roundId | `round.balance_before` and `round.balance_after` present and correct | P0 | EP |

---

## 8. Cross-Cutting Concerns

### 8.1 Security Tests

| TC-ID | Test Case | Input | Expected Result | Priority | Type |
|-------|-----------|-------|-----------------|----------|------|
| TC-SEC-001 | Missing Authorization header | No header on protected endpoint | 401 `{ code: "missing_token" }` | P0 | NEG |
| TC-SEC-002 | Malformed Bearer token | `Authorization: Bearer not.a.jwt` | 401 `{ code: "invalid_token" }` | P0 | SEC |
| TC-SEC-003 | Expired JWT | Token with exp in the past | 401 `{ code: "token_expired" }` | P0 | SEC |
| TC-SEC-004 | Token with wrong algorithm (HS256) | JWT signed with HS256 instead of RS256 | 401 `{ code: "invalid_token_alg" }` | P0 | SEC |
| TC-SEC-005 | Token with invalid signature | Modified JWT payload, original signature | 401 `{ code: "invalid_token_signature" }` | P0 | SEC |
| TC-SEC-006 | Token with nbf in the future | JWT with `nbf` > current time | 401 `{ code: "token_not_active" }` | P1 | SEC |
| TC-SEC-007 | Token with wrong issuer | JWT `iss` does not match configured `JWT_ISSUER` | 401 `{ code: "invalid_token_issuer" }` (only if JWT_ISSUER is set) | P2 | SEC |
| TC-SEC-008 | Token with wrong audience | JWT `aud` does not match `JWT_AUDIENCE` | 401 `{ code: "invalid_token_audience" }` (only if JWT_AUDIENCE is set) | P2 | SEC |
| TC-SEC-009 | SQL injection in session_id | `session_id: "'; DROP TABLE game_sessions;--"` | No SQL execution; session not found error | P0 | SEC |
| TC-SEC-010 | XSS in game_id | `game_id: "<script>alert(1)</script>"` | Input stored/returned but never rendered as HTML by API | P1 | SEC |
| TC-SEC-011 | Request body > 10kb | POST with >10kb JSON body | 413 Payload Too Large (Express json limit) | P1 | SEC |
| TC-SEC-012 | CORS preflight -- allowed origin | OPTIONS request from allowed origin | 204, `Access-Control-Allow-Origin` header present | P1 | EP |
| TC-SEC-013 | CORS -- disallowed origin | OPTIONS from non-configured origin (when CORS_ORIGINS is not *) | No `Access-Control-Allow-Origin` header | P2 | SEC |
| TC-SEC-014 | Refresh token httpOnly flag | Login response | Cookie has `HttpOnly` flag; not accessible via JavaScript | P0 | SEC |
| TC-SEC-015 | Refresh token secure flag (production) | Login in NODE_ENV=production | Cookie has `Secure` flag | P1 | SEC |
| TC-SEC-016 | Refresh token path scoped | Login response | Cookie `Path=/api/v1/auth` (not sent to other endpoints) | P1 | SEC |
| TC-SEC-017 | User cannot access other user's round detail | GET /history/:roundId with another user's round | 404 `not_found` (access control at query level) | P0 | SEC |
| TC-SEC-018 | Invalid UUID format in roundId | GET /history/not-a-uuid | 404 `not_found` (UUID regex validation) | P1 | NEG |
| TC-SEC-019 | Algorithm confusion attack (none) | JWT with `alg: "none"` | 401 `invalid_token_alg` | P0 | SEC |
| TC-SEC-020 | Extra fields rejected by strict schemas | Any strict endpoint + unknown fields | 400 `invalid_body` | P1 | SEC |

### 8.2 API Contract Tests

| TC-ID | Test Case | Endpoint | Expected Result | Priority | Type |
|-------|-----------|----------|-----------------|----------|------|
| TC-API-001 | X-Request-Id header on all responses | Any endpoint | Response includes `X-Request-Id` header (12-char UUID prefix) | P1 | EP |
| TC-API-002 | Content-Type: application/json | Any JSON endpoint | `Content-Type: application/json; charset=utf-8` | P1 | EP |
| TC-API-003 | Error response schema | Any error | Response matches `{ error: string, code: string }` | P0 | EP |
| TC-API-004 | 404 for unknown route | GET /api/v1/nonexistent | 404 `{ error: "Not found", code: "not_found" }` | P2 | NEG |
| TC-API-005 | Health check | GET /health | 200 `{ status: "ok" }` | P0 | EP |
| TC-API-006 | Readiness check -- DB up | GET /ready | 200 `{ status: "ready", checks: { database: { status: "ok" } } }` | P1 | EP |
| TC-API-007 | Readiness check -- DB down | GET /ready (with DB offline) | 503 `{ status: "degraded", checks: { database: { status: "fail" } } }` | P1 | NEG |
| TC-API-008 | OpenAPI spec served | GET /api-docs.json | 200, valid OpenAPI JSON document | P2 | EP |
| TC-API-009 | Swagger UI accessible | GET /api-docs/ | 200, HTML page | P3 | EP |

### 8.3 History & Reporting

| TC-ID | Test Case | Endpoint | Input | Expected Result | Priority | Type |
|-------|-----------|----------|-------|-----------------|----------|------|
| TC-HIST-001 | Fetch paginated history | GET /api/v1/history?limit=10&offset=0 | 200, `items` array, `total`, `limit: 10`, `offset: 0` | P0 | EP |
| TC-HIST-002 | Default pagination | GET /api/v1/history | `limit: 50`, `offset: 0` | P1 | EP |
| TC-HIST-003 | Filter by result=win | GET /api/v1/history?result=win | Only items where win > 0 | P1 | EP |
| TC-HIST-004 | Filter by result=loss | GET /api/v1/history?result=loss | Only items where win = 0 | P1 | EP |
| TC-HIST-005 | Filter by date range | GET /api/v1/history?date_from=...&date_to=... | Only items within date range | P1 | EP |
| TC-HIST-006 | Filter by min_bet | GET /api/v1/history?min_bet=5 | Only items with bet >= 5.00 | P2 | EP |
| TC-HIST-007 | Filter by max_bet | GET /api/v1/history?max_bet=10 | Only items with bet <= 10.00 | P2 | EP |
| TC-HIST-008 | Summary statistics | GET /api/v1/history | `summary` object with `total_rounds`, `total_wagered`, `total_won`, `net_result`, `biggest_win` | P1 | EP |
| TC-HIST-009 | Empty history | New user with no spins | `items: []`, `total: 0`, summary all zeros | P1 | EP |
| TC-HIST-010 | History includes roulette rounds | Play roulette then fetch history | Roulette rounds appear in general history | P1 | COMB |
| TC-HIST-011 | Round detail for roulette includes bets | GET /history/:rouletteRoundId | `roulette_bets` array present with bet_type, numbers, amount, payout, la_partage | P1 | EP |

### 8.4 Performance Baselines

| TC-ID | Endpoint | Method | Expected P95 Latency | Condition |
|-------|----------|--------|---------------------|-----------|
| TC-PERF-001 | /health | GET | < 50ms | No load |
| TC-PERF-002 | /api/v1/auth/login | POST | < 300ms | Cold start; scrypt hashing |
| TC-PERF-003 | /api/v1/auth/register | POST | < 500ms | Includes scrypt + DB insert |
| TC-PERF-004 | /api/v1/game/init | POST | < 500ms | Session + wallet creation |
| TC-PERF-005 | /api/v1/spin | POST | < 200ms | Includes debit, RNG, credit, round insert |
| TC-PERF-006 | /api/v1/roulette/spin | POST | < 200ms | Includes bet validation, debit, RNG, credit |
| TC-PERF-007 | /api/v1/american-roulette/spin | POST | < 200ms | Same as European roulette |
| TC-PERF-008 | /api/v1/history | GET | < 500ms | With 1000+ rounds in DB |
| TC-PERF-009 | /api/v1/history/:roundId | GET | < 200ms | Single round with transactions |
| TC-PERF-010 | /api/v1/provably-fair/rotate | POST | < 300ms | Seed generation + DB ops |

---

## Appendix A: Test Technique Coverage Summary

| Technique | Count | Sections Applied |
|-----------|-------|-----------------|
| Equivalence Partitioning (EP) | 89 | All modules |
| Boundary Value Analysis (BVA) | 28 | Auth passwords, bet amounts/lines, rate limits, wallet, seeds |
| Decision Table (DT) | 42 | Roulette bet validation, payouts, La Partage |
| State Transition (ST) | 24 | Auth lifecycle, sessions, seed pairs, rate limit reset |
| Negative Testing (NEG) | 27 | Missing fields, invalid inputs, expired tokens |
| Security Testing (SEC) | 26 | SQL injection, XSS, JWT attacks, CORS, cookie flags |
| Combinatorial Testing (COMB) | 5 | Concurrent wallet ops, cross-game rate limiting |

## Appendix B: Test Case ID Ranges

| Prefix | Module | Range |
|--------|--------|-------|
| TC-AUTH | Authentication | 001-038 |
| TC-SLOT | Slots Game | 001-044 |
| TC-ROUL | European Roulette (bets) | 001-070 |
| TC-PAY | Roulette Payouts | 001-030 |
| TC-AROUL | American Roulette | 001-040 |
| TC-PF | Provably Fair | 001-017 |
| TC-SESS | Session Management | 001-006 |
| TC-RATE | Rate Limiting | 001-006 |
| TC-IDEMP | Idempotency | 001-007 |
| TC-WAL | Wallet & Balance | 001-012 |
| TC-SEC | Security | 001-020 |
| TC-API | API Contract | 001-009 |
| TC-HIST | History & Reporting | 001-011 |
| TC-PERF | Performance | 001-010 |

## Appendix C: Traceability to Source Code

| Module | Key Source Files |
|--------|-----------------|
| Authentication | `backend/src/routes/auth.ts`, `backend/src/contracts/authContract.ts`, `backend/src/auth/passwordHash.ts`, `backend/src/auth/jwtSigner.ts`, `backend/src/auth/refreshTokenStore.ts`, `backend/src/middleware/auth.ts` |
| Slots Engine | `backend/src/routes/game.ts`, `backend/src/contracts/gameContract.ts`, `backend/src/engine/gameConfig.ts`, `backend/src/engine/spinEngine.ts`, `backend/src/store.ts` |
| European Roulette | `backend/src/routes/roulette.ts`, `backend/src/contracts/rouletteContract.ts`, `backend/src/engine/rouletteConfig.ts`, `backend/src/engine/rouletteValidation.ts`, `backend/src/engine/rouletteEngine.ts` |
| American Roulette | `backend/src/routes/americanRoulette.ts`, `backend/src/engine/americanRouletteConfig.ts`, `backend/src/engine/americanRouletteValidation.ts`, `backend/src/engine/americanRouletteEngine.ts` |
| Provably Fair | `backend/src/provablyFair.ts`, `backend/src/seedStore.ts` |
| Wallet | `backend/src/walletStore.ts` |
| Session & Rate Limiting | `backend/src/store.ts` (session, rate limit, idempotency management) |
| API Infrastructure | `backend/src/app.ts` (CORS, JSON limit, X-Request-Id, error handler, health/ready probes) |
