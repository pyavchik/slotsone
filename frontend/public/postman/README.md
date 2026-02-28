# Postman: Slots API — Regression Suite

Collection and environment for testing the Slots API — Full Regression Suite.

## Files

| File | Description |
|------|-------------|
| `slots-collection.json` | Requests and test scripts (TC-01 … TC-14) |
| `dev.env.json` | Environment: base_url, jwt_token, session_id, user_id, game_id |

## Environment Variables

Import the environment in Postman and set the values:

| Variable | Example | Description |
|----------|---------|-------------|
| `base_url` | `http://localhost:3001` | API base URL |
| `jwt_token` | `eyJhbGciOiJSUzI1NiIs...` | JWT Bearer token |
| `session_id` | *(set by TC-01)* | Game session identifier (populated automatically from TC-01 response) |
| `user_id` | `12345` | User ID (used for IDOR checks) |
| `game_id` | `slot_mega_fortune_001` | Game ID |

The remaining variables (`last_spin_id`, `balance_before_spin`, `idempotency_key`) are populated by test scripts.

## Test Cases

### Happy Path
- **TC-01**: POST /api/v1/game/init — 200, session_id, config (min/max bet), balance.
- **TC-02**: POST /api/v1/spin — 200, spin_id, outcome.reel_matrix, outcome.win, balance; saves last_spin_id and last_balance_amount.
- **TC-03**: POST /api/v1/spin — validates: balance changed by `-bet + win`.
- **TC-04**: POST /api/v1/spin — validates outcome structure (if bonus_triggered present — type must be free_spins or bonus).

### Negative Testing
- **TC-05**: POST /spin without Authorization — 401.
- **TC-06**: POST /spin with bet > balance — 422, insufficient_balance error.
- **TC-07**: POST /spin with bet.amount = -100 — 400.
- **TC-08**: POST /spin twice with the same Idempotency-Key — 409 or 200 with same spin_id.
- **TC-09**: POST /spin with JWT alg:none — 401.
- **TC-10**: GET /history?user_id=99999 — 403 or 200 with own data only.

### Security Testing
- **TC-11**: POST /spin with bet.amount = "1; DROP TABLE spins;--" — 4xx, not 500.
- **TC-12**: POST /spin with session_id = "\<script>alert(1)\</script>" — 4xx, no unescaped `<script>` in response.
- **TC-13**: Rate limit — single request; full test: 50+ req/s → expect 429.
- **TC-14**: Replay — two requests with the same Idempotency-Key; second: 200 with same spin_id or 409.

## Running in Postman

1. **Import**: click **Import** → select `slots-collection.json` and `dev.env.json`.
2. Select the **Slots API - Dev** environment in the top-right dropdown.
3. Set a real `jwt_token` (obtain one from POST /api/v1/auth/login) and optionally `session_id` (or let TC-01 populate it).
4. Run a single request: open it → **Send** → check the **Test Results** tab.
5. Run the full suite: right-click the collection → **Run collection** (see below).

## Collection Runner (Regression Suite)

1. Right-click the **Slots API - Full Regression** collection → **Run collection**.
2. Select the **Slots API - Dev** environment.
3. Options:
   - **Iterations**: 1 (full single pass).
   - **Delay**: 100 ms between requests (optional, prevents accidental rate-limit on happy path).
4. Click **Run Slots API - Full Regression** — all requests execute in order; results appear in the report.

Folder order: Happy Path → Negative Testing → Security Testing. TC-01 runs first and populates `session_id` in the environment for subsequent requests.

## Newman CLI

Install:

```bash
npm install -g newman
npm install -g newman-reporter-htmlextra
```

Run with environment:

```bash
cd postman
newman run slots-collection.json -e dev.env.json
```

With HTML report (htmlextra):

```bash
newman run slots-collection.json -e dev.env.json -r htmlextra --reporter-htmlextra-export report.html
```

Open `report.html` in a browser after the run.

Additional Newman options:

```bash
# 200 ms delay between requests (reduce load / avoid rate limit)
newman run slots-collection.json -e dev.env.json -d 200

# 10-second request timeout
newman run slots-collection.json -e dev.env.json --timeout-request 10000

# Override variables from CLI
newman run slots-collection.json -e dev.env.json --env-var "base_url=https://api.casino-staging.com"
```

## Notes

- **TC-06**: for a stable 422, use a bet larger than the current balance (e.g. 999999) or a user with zero balance.
- **TC-08**: to verify idempotency, run TC-08 twice with the same Idempotency-Key (set a fixed `idempotency_key` in the environment or edit the header to a constant value).
- **TC-13**: a full rate-limit check requires a separate scenario with many iterations in a short window; the collection entry only validates 200/429 and the presence of Retry-After on a 429.
