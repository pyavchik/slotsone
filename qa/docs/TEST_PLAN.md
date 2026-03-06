# SlotsOne RGS -- QA Test Plan

| Field            | Value                                      |
|------------------|--------------------------------------------|
| **Document ID**  | QA-TP-001                                  |
| **Version**      | 1.1                                        |
| **Status**       | Draft                                      |
| **Author**       | QA Engineering                             |
| **Created**      | 2026-03-05                                 |
| **Last Updated** | 2026-03-06                                 |
| **Review Cycle** | Per sprint (bi-weekly)                     |
| **Classification** | Internal -- Confidential                 |

---

## Document Revision History

| Version | Date       | Author         | Changes                        |
|---------|------------|----------------|--------------------------------|
| 0.1     | 2026-02-10 | QA Engineering | Initial draft                  |
| 0.5     | 2026-02-24 | QA Engineering | Added roulette test coverage   |
| 1.0     | 2026-03-05 | QA Engineering | Full plan with American Roulette, admin panel |
| 1.1     | 2026-03-06 | QA Engineering | Added Book of Dead multi-game, wallet top-up |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Test Items](#2-test-items)
3. [Features to Test](#3-features-to-test)
4. [Test Strategy](#4-test-strategy)
5. [Test Environment](#5-test-environment)
6. [Entry and Exit Criteria](#6-entry-and-exit-criteria)
7. [Risk Assessment](#7-risk-assessment)
8. [Test Schedule](#8-test-schedule)
9. [Roles and Responsibilities](#9-roles-and-responsibilities)
10. [Test Deliverables](#10-test-deliverables)
11. [Tools](#11-tools)
12. [Appendix A -- Glossary](#appendix-a--glossary)
13. [Appendix B -- Applicable Standards](#appendix-b--applicable-standards)

---

## 1. Introduction

### 1.1 Purpose

This document defines the test strategy, scope, approach, resources, and schedule for quality assurance activities on the **SlotsOne Remote Game Server (RGS)** -- a real-money gaming platform comprising a backend API, web-based game clients, and an operator administration panel.

The plan is designed to ensure that the SlotsOne platform meets functional requirements, regulatory compliance standards, and the level of quality expected in a licensed iGaming environment.

### 1.2 Scope

Testing covers the following components:

| Component       | Technology                | Description                                |
|-----------------|---------------------------|--------------------------------------------|
| Backend API     | Express / Node.js / TypeScript | Authentication, game engines (slots, roulette), wallet, history, provably fair system |
| Frontend Client | React / Vite / PixiJS    | Lobby, slot machine UI, roulette table UI, history views, responsive layout |
| Admin Panel     | Next.js 14 / Prisma / shadcn/ui | Player management, transaction monitoring, game catalog toggles, KYC, bonuses |
| Infrastructure  | Docker, PostgreSQL, Caddy | Containerised deployment, database integrity, TLS termination, health probes |

**Out of scope:** Third-party payment gateway integration, live dealer feeds, native mobile applications.

### 1.3 References

| ID    | Document                               | Location                    |
|-------|----------------------------------------|-----------------------------|
| REF-1 | OpenAPI Specification v1               | `backend/openapi.json`      |
| REF-2 | Slot Game Math Model (Mega Fortune)    | Engine source: `backend/src/engine/gameConfig.ts` |
| REF-3 | European Roulette Engine Specification | `backend/src/engine/rouletteConfig.ts` |
| REF-4 | MGA Technical Standards (2024)         | Malta Gaming Authority      |
| REF-5 | UKGC Remote Technical Standards        | UK Gambling Commission      |
| REF-6 | ISO/IEC 25010:2011 (Product Quality)   | International standard      |
| REF-7 | ISTQB Foundation Level Syllabus v4.0   | ISTQB                       |

### 1.4 Glossary

See [Appendix A](#appendix-a--glossary).

---

## 2. Test Items

### 2.1 Backend API (Express / Node.js)

| Module              | Endpoints / Functions                                   | Version |
|---------------------|---------------------------------------------------------|---------|
| Authentication      | `POST /api/v1/auth/register`, `POST /api/v1/auth/login` | 1.0     |
| Slot Game Engine    | `POST /api/v1/game/init`, `POST /api/v1/spin` (multi-game registry) | 1.1 |
| Book of Dead Engine | `game_id: slot_book_of_dead_001`, 10 paylines, expanding symbols | 1.1 |
| European Roulette   | `POST /api/v1/roulette/init`, `POST /api/v1/roulette/spin` | 1.0  |
| Wallet              | Balance read, debit (optimistic locking), credit, `POST /api/v1/wallet/topup` | 1.1 |
| Game History        | `GET /api/v1/game/history` with filters, pagination, summary | 1.0 |
| Round Detail        | `GET /api/v1/game/round/:id` with transactions          | 1.0     |
| Provably Fair       | `POST /api/v1/game/seed/rotate`, `PUT /api/v1/game/seed/client`, seed verification | 1.0 |
| Health / Infra      | `GET /api/v1/health`                                    | 1.0     |

### 2.2 Frontend Client (React / Vite)

| Module              | Description                                              |
|---------------------|----------------------------------------------------------|
| Lobby               | Game catalog grid, category filtering, admin toggle respect |
| Slot Machine (PixiJS) | 5x3 reel animation, multi-game symbol system, wild/scatter, free spins |
| Book of Dead          | 10 paylines, Egyptian-themed symbols, Book as Wild+Scatter, expanding symbols |
| European Roulette   | Wheel animation, betting table, La Partage, announced bets |
| American Roulette   | 38-pocket wheel (0, 00), 12 bet types, chip denominations |
| Authentication      | Login/register forms, JWT storage, token refresh          |
| Game History        | Filterable table, date range, win/loss filter, summary cards |
| Round Detail        | Reel grid replay, financial breakdown, provably fair verification |

### 2.3 Admin Panel (Next.js)

| Module              | Description                                              |
|---------------------|----------------------------------------------------------|
| Dashboard           | Player count, revenue, transaction volume                |
| Player Management   | Player list, wallet balances, session history            |
| Transaction Monitor | Transaction log with filtering                           |
| Game Catalog        | Enable/disable game toggles with lobby integration       |
| KYC Management      | Document upload, status tracking                         |
| Bonus Management    | Promotion CRUD, bonus assignment                         |
| Audit Log           | Admin action tracking                                    |

### 2.4 Infrastructure

| Item                | Description                                              |
|---------------------|----------------------------------------------------------|
| Docker Compose      | Multi-container orchestration (backend, frontend, PostgreSQL, admin, Caddy) |
| PostgreSQL          | Schema migrations (auto-scan), BIGINT wallet, optimistic locking |
| Caddy               | TLS termination, reverse proxy (production)              |

---

## 3. Features to Test

Features are prioritised using a P0-P3 scale aligned with business criticality and regulatory requirements.

### P0 -- Critical (Blocks Release)

| ID    | Feature                        | Acceptance Criteria                                           |
|-------|--------------------------------|---------------------------------------------------------------|
| P0-01 | User registration              | New user receives valid RS256 JWT; wallet created with $1000 default balance |
| P0-02 | User login                     | Correct credentials return access token; incorrect credentials return 401 |
| P0-03 | Wallet debit (spin)            | Balance reduced by exact bet amount; BIGINT cents precision preserved |
| P0-04 | Wallet credit (win)            | Balance increased by exact win amount; no rounding errors     |
| P0-05 | Wallet balance read            | Returns current balance in USD with cent precision            |
| P0-06 | Slot spin outcome correctness  | Reel matrix matches deterministic PRNG output for given seed  |
| P0-07 | Slot payout calculation        | Win amounts match paytable for all symbol combinations (3/4/5 of a kind) |
| P0-08 | Roulette spin outcome          | Winning number determined by seeded PRNG; maps to correct wheel position |
| P0-09 | Roulette payout correctness    | Each bet type pays at correct multiplier (straight 35:1, split 17:1, etc.) |
| P0-10 | La Partage rule                | Even-money bets return 50% when ball lands on zero           |
| P0-11 | Provably fair verification     | `HMAC-SHA256(server_seed, client_seed:nonce)` reproduces the spin seed |
| P0-12 | Insufficient balance guard     | Spin rejected with `insufficient_balance` when bet exceeds wallet |
| P0-13 | Optimistic locking             | Concurrent debit attempts do not cause double-spend           |
| P0-14 | Multi-game init dispatch        | `game_id` in init request selects correct engine config (Mega Fortune vs Book of Dead) |
| P0-15 | Book of Dead payout correctness | Win amounts match BoD paytable; Book symbol acts as Wild+Scatter |
| P0-16 | Wallet top-up                  | `POST /api/v1/wallet/topup` credits correct amount; balance reflects addition |

### P1 -- High (Sprint Blocker)

| ID    | Feature                        | Acceptance Criteria                                           |
|-------|--------------------------------|---------------------------------------------------------------|
| P1-01 | All roulette bet types         | Straight, split, street, trio, corner, basket, six-line, column, dozen, red/black, even/odd, high/low |
| P1-02 | Bet validation (slots)         | Amount within min ($0.10) and max ($100); valid currency; valid line count (1-20) |
| P1-03 | Bet validation (roulette)      | Total bet within max ($2000); per-type max enforced; number array correct for bet type |
| P1-04 | Announced bets                 | Voisins du Zero (9 chips), Tiers du Cylindre (6 chips), Orphelins (5 chips) expand correctly |
| P1-05 | Neighbor bets                  | `neighbors:N:center` expands to 2N+1 straight bets on correct wheel segment |
| P1-06 | Session management             | Session created on init; expires after TTL; expired session returns `session_expired` |
| P1-07 | Rate limiting                  | Excessive spin requests return 429 with `rate_limited` code   |
| P1-08 | Idempotency                    | Duplicate spin request with same idempotency key returns identical response |
| P1-09 | Idempotency key mismatch       | Same key with different payload returns error                 |
| P1-10 | Seed rotation                  | Previous server seed revealed; new seed pair generated; nonce resets |
| P1-11 | Client seed update             | Custom client seed (1-64 chars) accepted; reflected in subsequent spins |
| P1-12 | Scatter / Free Spins trigger   | 3/4/5 scatters award 5/10/20 free spins with correct bonus round ID |
| P1-13 | Wild substitution              | Wild substitutes for all symbols except Scatter               |
| P1-15 | BoD expanding symbol           | During free spins, selected symbol expands to fill entire reel |
| P1-16 | BoD game-specific symbols      | Reel matrix contains only valid BoD symbols (RichWilde, Osiris, Anubis, Horus, Book, A, K, Q, J, 10) |
| P1-17 | Wallet top-up validation       | Amount must be positive, max $100,000; rejects 0, negative, and over-limit |
| P1-14 | JWT validation                 | Expired/malformed/missing tokens return 401                   |

### P2 -- Medium (Should Fix)

| ID    | Feature                        | Acceptance Criteria                                           |
|-------|--------------------------------|---------------------------------------------------------------|
| P2-01 | History filtering              | Filter by date range, result (win/loss/all), min/max bet     |
| P2-02 | History pagination             | Correct total count, limit/offset behavior, default limit applied |
| P2-03 | History summary                | total_rounds, total_wagered, total_won, net_result, biggest_win calculated correctly |
| P2-04 | Round detail                   | Returns reel matrix, financial breakdown, transactions, provably fair data |
| P2-05 | Roulette bet detail in round   | Round detail includes roulette_bets array with la_partage flag |
| P2-06 | Admin game toggles             | Disabled game hidden from lobby; re-enabled game reappears   |
| P2-07 | Admin player list              | Displays real player data from backend DB                     |
| P2-08 | Admin transaction log          | Transactions match backend DB records (BIGINT cents / 100 conversion) |
| P2-09 | Frontend responsive layout     | Lobby and game views render correctly on mobile viewports     |
| P2-10 | Lobby category filtering       | Slots, Roulette, Blackjack, Baccarat tabs filter correctly   |

### P3 -- Low (Nice to Have)

| ID    | Feature                        | Acceptance Criteria                                           |
|-------|--------------------------------|---------------------------------------------------------------|
| P3-01 | Concurrent spin stress         | 50 concurrent players spinning without wallet corruption      |
| P3-02 | Timezone handling              | History date filters work across UTC offset boundaries        |
| P3-03 | Large bet volume               | 10,000+ rounds per user queryable within response time budget |
| P3-04 | Chip denomination UI           | All denominations (1, 5, 10, 25, 100, 500) selectable and displayed |
| P3-05 | American Roulette 00 pocket    | Double-zero outcome produces correct payouts (no La Partage)  |
| P3-06 | Admin audit log                | All admin actions recorded with timestamp and actor           |
| P3-07 | OpenAPI spec drift             | `npm run openapi:check` passes with zero drift               |

---

## 4. Test Strategy

### 4.1 Test Levels

The test approach follows the **ISTQB test pyramid** adapted for a microservices architecture:

```
                    /\
                   /  \       System / E2E Tests
                  /----\      (Postman, Browser)
                 /      \
                /--------\    Integration Tests
               /          \   (API chain, DB verification)
              /------------\
             /              \  Unit Tests
            /________________\ (Engine, validation, crypto)
```

#### 4.1.1 Unit Testing

**Scope:** Individual functions in isolation -- RNG, payout calculation, bet validation, provably fair cryptography, wallet arithmetic.

| Area                    | Key Functions Under Test                                |
|-------------------------|---------------------------------------------------------|
| Slot RNG                | `createSeededRNG()` (Mulberry32) -- deterministic output for given seed |
| Slot Payout             | Line matching against paytable, wild substitution logic  |
| Roulette Engine         | `runRouletteSpin()` -- winning number derivation, bet evaluation |
| Roulette Validation     | `validateRouletteBets()` -- type/number/amount constraints |
| Provably Fair           | `deriveSpinSeed()`, `hashServerSeed()`, `hashOutcome()` |
| Wallet Arithmetic       | BIGINT cents conversion, rounding to 2 decimal places    |
| Announced Bet Expansion | `expandVoisins()`, `expandTiers()`, `expandOrphelins()`, `expandNeighborBet()` |
| Zod Schema Validation   | Request/response schemas parse valid input, reject invalid |

**Technique:** Each unit test verifies a single behaviour. Test data derived using Equivalence Partitioning and Boundary Value Analysis.

#### 4.1.2 Integration Testing

**Scope:** Multi-component interactions -- API endpoint chains with database verification.

| Chain                                         | Verification Points                            |
|-----------------------------------------------|------------------------------------------------|
| Register -> Login -> Init -> Spin -> History   | Token valid, session created, wallet debited, round persisted, history queryable |
| Register -> Init Roulette -> Place Bets -> Spin | Bets validated, winning number correct, La Partage applied, balance updated |
| Spin -> Round Detail -> Provably Fair Verify   | Server seed revealed on rotation, HMAC reproduces spin seed |
| Admin Login -> Toggle Game -> Lobby Refresh    | Disabled game excluded from `GET /admin/api/public/games` inactive set |
| Register -> Init BoD -> Spin -> Verify Symbols | Session uses BoD config, reel matrix contains only BoD symbols, paylines = 10 |
| Register -> Top-up -> Spin -> Verify Balance   | Top-up credited, spin debit applied to updated balance, history reflects both |

#### 4.1.3 System Testing

**Scope:** Full end-to-end flows exercised through the browser (frontend) and API client, with database state verification via direct `psql` queries.

- Complete player journey: registration through multi-game session with history review
- Admin workflow: login, review player, inspect transactions, toggle game, verify lobby impact
- Cross-component data integrity: wallet balance in DB matches API response matches UI display

#### 4.1.4 Regression Testing

**Scope:** Automated suite executed on every pull request via GitHub Actions CI pipeline.

- All unit tests (engine, validation, cryptography)
- API integration tests (auth flow, spin flow, history flow)
- Lint and type-check pass
- OpenAPI specification drift check (`npm run openapi:check`)

### 4.2 Test Types

#### 4.2.1 Functional Testing

Verification that all API endpoints and UI interactions produce correct results per the OpenAPI specification and game math models.

Key areas include:

- **Multi-game architecture (Book of Dead):** Validates that the game init dispatch correctly selects the BoD engine config (`slot_book_of_dead_001`), produces a 5x3 reel matrix with game-specific symbols (RichWilde, Osiris, Anubis, Horus, Book, A, K, Q, J, 10), enforces 10-payline evaluation, and handles the Book symbol as both Wild (line substitution) and Scatter (free spin trigger with expanding symbol mechanic).
- **Wallet top-up endpoint:** Verifies `POST /api/v1/wallet/topup` with boundary value testing ($0.01 minimum, $100,000 maximum), rejection of zero/negative/over-limit amounts, authentication enforcement, and correct balance accumulation across multiple top-ups.

#### 4.2.2 Performance Testing

| Metric                  | Target                          | Tool          |
|-------------------------|---------------------------------|---------------|
| API response time (P95) | < 200ms (spin), < 100ms (balance) | k6          |
| Concurrent players      | 100 simultaneous sessions       | k6 / Artillery |
| Database query time     | < 50ms for history (1000 rounds) | pgBench / psql EXPLAIN |
| Frontend LCP            | < 2.5s on 4G throttled          | Lighthouse    |

#### 4.2.3 Security Testing

| Area                    | Test Approach                                          |
|-------------------------|--------------------------------------------------------|
| JWT validation          | Expired, malformed, missing, wrong-algorithm tokens    |
| CORS policy             | Cross-origin requests from unauthorised domains blocked |
| Input sanitization      | SQL injection attempts in all string parameters        |
| Rate limiting           | Verify 429 response after burst threshold exceeded     |
| Wallet manipulation     | Negative bet amounts, zero bets, MAX_SAFE_INTEGER amounts |
| Session hijacking       | Stolen session ID from different user context rejected |
| Admin auth isolation    | Player JWT cannot access admin endpoints               |

#### 4.2.4 Compatibility Testing

| Browser        | Version   | Platform       |
|----------------|-----------|----------------|
| Chrome         | Latest    | Windows, macOS |
| Firefox        | Latest    | Windows, macOS |
| Safari         | Latest    | macOS, iOS     |
| Chrome Mobile  | Latest    | Android        |
| Safari Mobile  | Latest    | iOS            |

#### 4.2.5 Compliance Testing (RNG / RTP)

**Objective:** Validate that the PRNG produces statistically fair outcomes over a large sample.

| Test                    | Method                                                  | Acceptance Criteria |
|-------------------------|---------------------------------------------------------|---------------------|
| Slot RTP validation (Mega Fortune) | Run 1,000,000 simulated spins; calculate actual RTP | Within +/- 0.5% of theoretical 96.4% |
| Slot RTP validation (Book of Dead) | Run 1,000,000 simulated spins; calculate actual RTP | Within +/- 0.5% of theoretical 96.21% |
| Roulette number distribution | Run 1,000,000 spins; chi-squared test on 37 outcomes | p-value > 0.01 (no significant bias) |
| Roulette RTP (European) | Calculated from distribution + payouts                 | Within +/- 0.3% of theoretical 97.3% |
| PRNG seed independence  | Kolmogorov-Smirnov test on consecutive outputs         | Distribution indistinguishable from uniform |
| Provably fair integrity | 10,000 rounds verified post-hoc with revealed seeds    | 100% match rate     |

### 4.3 Test Design Techniques

#### 4.3.1 Equivalence Partitioning

| Input           | Invalid (Low) | Valid                  | Invalid (High)       |
|-----------------|---------------|------------------------|----------------------|
| Slot bet amount | < $0.10       | $0.10 -- $100.00       | > $100.00            |
| Slot line count | < 1           | 1 -- 20                | > 20                 |
| Roulette total bet | < $0.10   | $0.10 -- $2,000.00     | > $2,000.00          |
| Straight bet numbers | []      | [0] -- [36] (single)   | [0, 1] (wrong size)  |
| Client seed length | "" (empty) | 1 -- 64 characters     | > 64 characters      |
| Wallet top-up amount | <= $0.00  | $0.01 -- $100,000.00   | > $100,000.00        |

#### 4.3.2 Boundary Value Analysis

| Boundary                | Test Values                                           |
|-------------------------|-------------------------------------------------------|
| Slot min bet            | $0.09 (reject), $0.10 (accept), $0.11 (accept)       |
| Slot max bet            | $99.99 (accept), $100.00 (accept), $100.01 (reject)  |
| Roulette max total bet  | $1,999.99 (accept), $2,000.00 (accept), $2,000.01 (reject) |
| Straight max bet        | $99.99, $100.00, $100.01                              |
| Column/dozen max bet    | $999.99, $1,000.00, $1,000.01                         |
| Wallet balance          | $0.00 (cannot spin), $0.10 (minimum viable spin)      |
| History limit           | 0, 1, default, max                                    |
| Client seed             | 1 char, 64 chars, 65 chars                            |
| Wallet top-up min       | $0.00 (reject), $0.01 (accept), $0.02 (accept)       |
| Wallet top-up max       | $99,999.99 (accept), $100,000.00 (accept), $100,000.01 (reject) |

#### 4.3.3 State Transition Testing

```
Session Lifecycle:
  [None] --init--> [Active] --spin--> [Active] --TTL--> [Expired]
  [Expired] --spin--> [Error: session_expired]
  [Expired] --init--> [Active] (new session)

Seed Pair Lifecycle:
  [Active] --spin--> [Active, nonce++]
  [Active] --rotate--> [Revealed] + new [Active]
  [Revealed] -- server_seed exposed for verification

Wallet States:
  [balance >= bet] --debit--> [balance - bet]
  [balance < bet] --debit--> [Error: insufficient_balance]
  [any balance] --credit--> [balance + win]
```

#### 4.3.4 Decision Table -- Roulette Bet Evaluation

| Bet Type  | Winning Number | Numbers in Bet | Win? | Payout Multiplier | La Partage? |
|-----------|----------------|----------------|------|-------------------|-------------|
| straight  | 17             | [17]           | Yes  | 35:1              | No          |
| straight  | 17             | [5]            | No   | 0                 | No          |
| red       | 0              | [1,3,5,...]    | No   | 0                 | Yes (50%)   |
| red       | 1              | [1,3,5,...]    | Yes  | 1:1               | No          |
| red       | 2              | [1,3,5,...]    | No   | 0                 | No          |
| dozen     | 13             | [13-24]        | Yes  | 2:1               | No          |
| dozen     | 0              | [1-12]         | No   | 0                 | No          |
| column    | 1              | [1,4,7,...]    | Yes  | 2:1               | No          |
| split     | 4              | [4,7]          | Yes  | 17:1              | No          |
| corner    | 25             | [25,26,28,29]  | Yes  | 8:1               | No          |

#### 4.3.5 Pairwise / Combinatorial Testing

Used for roulette multi-bet scenarios: combinations of bet types placed simultaneously, verifying that total bet validation and individual bet evaluation are both correct when multiple bet types are active.

---

## 5. Test Environment

### 5.1 Environment Matrix

| Environment | Stack                                      | Purpose               | Data            |
|-------------|--------------------------------------------|-----------------------|-----------------|
| Local       | Docker Compose: backend + PostgreSQL + frontend | Developer testing   | Seeded test data |
| CI          | GitHub Actions: build + lint + unit + integration | Automated regression | Ephemeral DB   |
| Staging     | Docker Compose Prod: Caddy TLS on `pyavchik.space` | Pre-release validation | Snapshot of production |
| Production  | Same as staging                             | Smoke tests only      | Real player data |

### 5.2 Database Configuration

| Database          | Port | Purpose                                        |
|-------------------|------|------------------------------------------------|
| `slotsone`        | 5432 | Backend: users, wallets, seed_pairs, game_rounds, transactions |
| `slotsone_admin`  | 5433 | Admin panel: AdminUser, AdminNote, AuditLog, KYCDocument, Bonus, Promotion |

### 5.3 Test Accounts

| Role        | Email                    | Password   | Purpose                     |
|-------------|--------------------------|------------|-----------------------------|
| Admin       | admin@slotsone.com       | admin123   | Standard admin operations   |
| Super Admin | superadmin@slotsone.com  | admin123   | Full admin access           |
| Test Player | (registered via API)     | (dynamic)  | Automated test flows        |

### 5.4 Test Data Strategy

- **Unit tests:** Hardcoded seed values producing known deterministic outcomes
- **Integration tests:** Fresh user registration per test run; isolated wallet state
- **Statistical tests:** 1M+ generated spins using sequential seeds; outcomes aggregated
- **Admin tests:** Seeded via `npm run db:seed` (admin users + faker-generated sample data)

---

## 6. Entry and Exit Criteria

### 6.1 Entry Criteria

| Criterion                                          | Verification Method                 |
|----------------------------------------------------|-------------------------------------|
| Backend compiles without errors (`tsc`)            | CI build step                       |
| Database migrations run successfully               | `initDb()` scans and applies .sql files |
| All SQL migration files present in build           | Build script copies `src/migrations` to `dist/migrations` |
| API documentation accessible (Swagger UI)          | `GET /api-docs` returns 200         |
| Test accounts seeded                               | `npm run db:seed` completes for admin |
| No known P0 defects from previous sprint           | Bug tracker query                   |
| OpenAPI spec matches implementation                | `npm run openapi:check` passes      |

### 6.2 Exit Criteria

| Criterion                                          | Threshold                           |
|----------------------------------------------------|-------------------------------------|
| P0 test cases passed                               | 100%                                |
| P1 test cases passed                               | > 95%                               |
| P2 test cases passed                               | > 85%                               |
| Open critical / blocker defects                    | 0                                   |
| Open major defects                                 | < 3 (with documented workarounds)   |
| Slot RTP validation (Mega Fortune)                 | Within +/- 0.5% of 96.4%           |
| Slot RTP validation (Book of Dead)                 | Within +/- 0.5% of 96.21%          |
| European Roulette RTP validation                   | Within +/- 0.3% of 97.3%           |
| American Roulette RTP validation                   | Within +/- 0.3% of 94.74%          |
| Provably fair verification                         | 100% of sampled rounds verify       |
| Regression suite pass rate                         | 100%                                |

### 6.3 Suspension Criteria

Testing shall be suspended if:

- Backend service fails to start (Docker health check fails)
- Database connection unavailable
- P0 defect discovered that invalidates wallet integrity
- Security vulnerability identified in authentication flow

### 6.4 Resumption Criteria

- Root cause identified and fix deployed to test environment
- Affected test cases re-executed from the beginning of the impacted flow

---

## 7. Risk Assessment

### 7.1 Product Risks

| ID   | Risk                                           | Prob.  | Impact   | Mitigation                                                       |
|------|-------------------------------------------------|--------|----------|------------------------------------------------------------------|
| PR-1 | RNG bias producing non-uniform distribution     | Low    | Critical | Chi-squared statistical test over 1M spins; HMAC-SHA256 seed derivation ensures avalanche property |
| PR-2 | Wallet race condition (optimistic locking bypass) | Medium | Critical | Concurrent debit stress test; verify version column increments atomically; DB-level constraint `balance_cents >= 0` |
| PR-3 | Double-spend via missing idempotency            | Medium | Critical | Test duplicate spin requests with same/different idempotency keys; verify single debit in DB |
| PR-4 | Insufficient balance check bypass               | Low    | Critical | Negative bet, zero bet, fractional cent tests; verify DB-level `balance_cents >= $2` clause |
| PR-5 | Roulette payout miscalculation                  | Medium | High     | Decision table test for all 14 bet types x representative winning numbers; verify La Partage edge case |
| PR-6 | La Partage applied incorrectly                  | Medium | High     | Test even-money bets on 0 (should return 50%); test non-even-money on 0 (should return 0%); test American Roulette (no La Partage) |
| PR-7 | Session hijacking via stolen JWT                | Low    | High     | Verify JWT contains user ID; verify one user cannot access another user's session; RS256 signature validation |
| PR-8 | Frontend/backend state desynchronisation        | Medium | Medium   | Balance displayed in UI matches API response after every spin; WebSocket or polling for real-time sync |
| PR-9 | BIGINT cents overflow or rounding error         | Low    | High     | Test with large balances (> $10M); verify `/100` conversion at API boundary; no floating-point in DB |
| PR-10 | Announced bet expansion error                  | Medium | Medium   | Unit test each announced bet (Voisins: 7 bets / 9 chips, Tiers: 6 bets / 6 chips, Orphelins: 5 bets / 5 chips) |
| PR-11 | Admin game toggle not reflected in lobby       | Low    | Medium   | E2E test: toggle off -> verify lobby excludes game -> toggle on -> verify lobby includes game |
| PR-12 | Migration script ordering or idempotency       | Low    | High     | Verify `initDb()` sorts files lexicographically; test re-run of migrations (idempotent or guarded) |

### 7.2 Project Risks

| ID   | Risk                                           | Prob.  | Impact   | Mitigation                                                       |
|------|-------------------------------------------------|--------|----------|------------------------------------------------------------------|
| PJ-1 | Insufficient test environment parity           | Medium | Medium   | Docker Compose ensures identical stack across environments       |
| PJ-2 | Test data contamination between test runs      | Medium | Medium   | Fresh user registration per integration test; DB truncation in CI |
| PJ-3 | Regulatory requirement changes (MGA/UKGC)      | Low    | High     | Quarterly review of compliance test suite against published standards |
| PJ-4 | Late requirement changes affecting game math   | Medium | Medium   | RTP validation as automated regression; paytable changes require full re-simulation |

---

## 8. Test Schedule

### 8.1 Sprint-Based Cadence (2-Week Sprints)

| Phase              | Timing              | Activities                                                   |
|--------------------|---------------------|--------------------------------------------------------------|
| Sprint Planning    | Day 1               | Review user stories; identify testable acceptance criteria; estimate test effort; assign test cases to features |
| Test Design        | Days 1-3            | Write new test cases for sprint stories; update regression suite |
| Development        | Days 2-8            | Execute exploratory testing on dev builds; unit test review in PRs |
| Test Execution     | Days 5-9            | Execute manual test cases; run automated integration suite    |
| Bug Fix Cycle      | Days 8-9            | Verify defect fixes; regression on impacted areas             |
| Sprint Review      | Day 10              | Present test report; demonstrate coverage metrics; flag open risks |

### 8.2 Continuous Activities

| Activity                               | Trigger                      |
|----------------------------------------|------------------------------|
| CI regression suite                    | Every pull request            |
| OpenAPI drift check                    | Every backend PR              |
| Lint + type check                      | Every PR (frontend + backend) |
| Statistical RTP validation             | Monthly or after engine changes |
| Security scan                          | Monthly or after auth changes  |
| Performance baseline                   | Per release                   |

### 8.3 Milestone Schedule

| Milestone                              | Target Date   | Criteria                                   |
|----------------------------------------|---------------|--------------------------------------------|
| Slot engine full regression automated  | Sprint 1 end  | All P0/P1 slot tests in CI                 |
| European Roulette coverage complete    | Sprint 2 end  | All bet types, La Partage, announced bets  |
| American Roulette coverage complete    | Sprint 3 end  | All bet types, 00 pocket, no La Partage    |
| Admin panel test suite                 | Sprint 3 end  | Game toggles, player list, transactions    |
| Performance baseline established       | Sprint 4 end  | k6 scripts, documented thresholds          |
| Compliance test report                 | Sprint 5 end  | 1M spin simulation, chi-squared results    |

---

## 9. Roles and Responsibilities

| Role             | Responsibilities                                                              |
|------------------|-------------------------------------------------------------------------------|
| **QA Engineer**  | Test plan authoring; test case design and execution; automation development; defect reporting and triage; statistical analysis for RTP validation; sprint test reports |
| **Developer**    | Unit test implementation; code review participation; defect resolution; build and deployment support |
| **Product Owner** | Acceptance criteria definition; priority decisions; defect severity arbitration; sign-off on exit criteria |
| **DevOps**       | CI/CD pipeline maintenance; test environment provisioning; Docker configuration; monitoring setup |

### RACI Matrix

| Activity                  | QA Engineer | Developer | Product Owner | DevOps |
|---------------------------|:-----------:|:---------:|:-------------:|:------:|
| Test plan                 | R/A         | C         | I             | I      |
| Test case design          | R/A         | C         | C             | --     |
| Unit tests                | C           | R/A       | --            | --     |
| Integration tests         | R/A         | C         | --            | --     |
| E2E tests                 | R/A         | C         | I             | C      |
| Performance tests         | R/A         | C         | I             | C      |
| Defect reporting          | R/A         | I         | I             | --     |
| Defect fix                | C           | R/A       | --            | --     |
| CI pipeline               | C           | C         | --            | R/A    |
| Test environment          | C           | --        | --            | R/A    |
| Release sign-off          | C           | C         | R/A           | --     |

*R = Responsible, A = Accountable, C = Consulted, I = Informed*

---

## 10. Test Deliverables

| Deliverable                        | Format                | Frequency          |
|------------------------------------|-----------------------|--------------------|
| This test plan                     | Markdown (versioned)  | Updated per sprint |
| Test case matrix                   | Spreadsheet / Markdown | Updated per sprint |
| Postman collection (API tests)     | JSON export           | Updated per sprint |
| Automated integration test suite   | TypeScript / Vitest   | Continuous (CI)    |
| Sprint test report                 | Markdown summary      | Per sprint         |
| Defect reports                     | GitHub Issues         | As discovered      |
| RTP validation report              | CSV + analysis doc    | Monthly            |
| Performance test results           | k6 HTML report        | Per release        |
| Compliance evidence pack           | PDF bundle            | Per regulatory audit |

---

## 11. Tools

| Category           | Tool                        | Purpose                                          |
|--------------------|-----------------------------|--------------------------------------------------|
| API Testing        | Postman, Swagger UI, curl   | Manual and semi-automated API test execution     |
| Test Automation    | Vitest, Supertest           | Unit and integration test framework              |
| Performance        | k6, Artillery               | Load testing, response time measurement          |
| Test Management    | GitHub Issues + labels      | Test case tracking, sprint test scope            |
| Bug Tracking       | GitHub Issues               | Defect lifecycle management                      |
| CI/CD              | GitHub Actions              | Automated build, lint, test on every PR          |
| Database           | pgAdmin, psql               | Direct DB verification, query analysis           |
| Monitoring         | Docker logs, pino (structured logging) | Runtime log inspection, error correlation |
| Version Control    | Git, GitHub                 | Source control, PR-based workflow                 |
| Containers         | Docker, Docker Compose      | Environment provisioning, service orchestration  |
| Browser Testing    | Chrome DevTools, Lighthouse | Frontend debugging, performance audit            |
| Statistical        | Python (scipy, numpy)       | Chi-squared test, RTP simulation analysis        |
| Security           | OWASP ZAP (manual)          | Exploratory security scanning                    |

---

## Appendix A -- Glossary

| Term              | Definition                                                                     |
|-------------------|--------------------------------------------------------------------------------|
| **RGS**           | Remote Game Server -- the backend system that manages game logic, outcomes, and wallet operations |
| **RNG**           | Random Number Generator -- the mechanism producing unpredictable game outcomes  |
| **PRNG**          | Pseudorandom Number Generator -- deterministic algorithm producing numbers that approximate randomness; seeded for reproducibility |
| **Mulberry32**    | 32-bit PRNG algorithm used in the slot engine for deterministic outcome generation |
| **RTP**           | Return to Player -- the theoretical percentage of total wagered money returned to players over time (e.g., 96.4% means $96.40 returned per $100 wagered) |
| **Provably Fair** | Cryptographic scheme allowing players to independently verify that game outcomes were not manipulated; uses HMAC-SHA256 with server seed, client seed, and nonce |
| **La Partage**    | European roulette rule: even-money bets return 50% of the stake when the ball lands on zero, reducing house edge from 2.7% to 1.35% on those bets |
| **HMAC-SHA256**   | Hash-based Message Authentication Code using SHA-256; used to derive spin seeds from server_seed + client_seed + nonce |
| **Optimistic Locking** | Concurrency control pattern: wallet debit includes a version check in the UPDATE WHERE clause; if version changed, the operation fails and must be retried |
| **BIGINT Cents**  | Wallet balances stored as integers in cents (e.g., $10.50 = 1050) to avoid floating-point precision errors |
| **Idempotency**   | Property ensuring that repeating the same request produces the same result without side effects; prevents double-spend on network retries |
| **MGA**           | Malta Gaming Authority -- EU gaming regulator issuing licenses for online gambling operators |
| **UKGC**          | UK Gambling Commission -- regulatory body overseeing gambling in the United Kingdom |
| **ISTQB**         | International Software Testing Qualifications Board -- provides standardised testing terminology and certification |

---

## Appendix B -- Applicable Standards

| Standard                                   | Relevance                                           |
|--------------------------------------------|-----------------------------------------------------|
| MGA Technical Standards (2024)             | RNG certification, player fund protection, responsible gaming controls |
| UKGC Remote Technical Standards (RTS)      | Fair and open testing requirements, RNG testing, game rules display |
| ISO/IEC 25010:2011                         | Software product quality model (functional suitability, reliability, security, performance efficiency) |
| ISTQB Foundation Level Syllabus v4.0       | Test process, techniques, and management terminology used in this plan |
| OWASP Top 10 (2021)                        | Security testing baseline for web application vulnerabilities |
| GLI-11 (Gaming Laboratories International) | RNG testing standard for electronic gaming systems  |

---

*This is a living document. It shall be reviewed and updated at the start of each sprint to reflect changes in scope, risk profile, or regulatory requirements.*
