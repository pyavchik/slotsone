# Security and Compliance of the iGaming Platform

Threats, protective measures, and regulatory compliance (penetration testing & security architecture).

---

## 1. THREATS AND ATTACKS

### 1.1 Replay Attack

**Description**: an attacker intercepts a successful POST /spin request (including headers and body) and then re-sends it unchanged. The goal is to receive a repeated win credit or a repeated spin without a bet being deducted.

**Vectors**:
- Traffic interception (MITM in the absence of TLS or client compromise).
- Copying the request from DevTools/Proxy (Har, curl) and re-sending it.

**Risk**: double debit/credit, balance and audit distortion.

---

### 1.2 Race Condition (double spin with a single balance)

**Description**: a user or script sends two (or more) POST /spin requests almost simultaneously. Both pass the "balance >= bet" check before either of them has had a chance to deduct funds. As a result, only one bet is deducted but two spins are executed, or two bets are deducted with an insufficient balance → negative balance.

**Vectors**:
- Double-clicking the SPIN button.
- Parallel requests from a script (Promise.all with two /spin calls).
- Auto-spin bypassing the UI lock on the client.

**Risk**: balance exploitation, negative balance, desynchronisation with the DB and transactions.

---

### 1.3 Parameter Tampering

**Description**: modification of request parameters on the client side or through a proxy: `bet_amount`, `session_id`, `game_id`, `currency`, `lines`, etc.

**Examples**:
- Increasing `bet_amount` in the hope that the server does not check limits or does not compare against the balance.
- Substituting `session_id` to play under another session.
- Reducing `bet_amount` to zero or fractions while retaining payouts at the full bet rate (if the server trusts the client).
- Changing `game_id` to one with a more favourable RTP/bonuses.

**Risk**: bypassing limits, accessing other sessions, manipulating payouts, fraud.

---

### 1.4 JWT Manipulation

**"none" algorithm**: the JWT header specifies `"alg": "none"` and the signature is removed. Some old libraries, when misconfigured, accept such a token as valid and trust its contents (sub, session_id), allowing an attacker to impersonate another user.

**Brute force secret**: when a symmetric algorithm (HS256) is used, the signing secret can be brute-forced. If the secret is weak or compromised, an attacker can forge tokens with an arbitrary `sub` (user_id).

**Claims substitution**: without signature verification or with broken verification — altering `sub`, `session_id`, `role` in the payload.

**Risk**: full authentication compromise, access under another account, session manipulation.

---

### 1.5 IDOR (Insecure Direct Object Reference)

**Description**: access to another user's objects by guessing or enumerating identifiers.

**Examples**:
- GET /api/v1/history?user_id=12345 — returning another user's history when the check "current user_id == 12345" is absent.
- GET /api/v1/spin/{spin_id} with another user's spin_id — leaking outcome, bet, balance.
- GET /api/v1/session/{session_id} — accessing another user's session.

**Risk**: PII leakage, bet and win history exposure, privacy violation and GDPR breach.

---

### 1.6 Negative Balance Exploit

**Description**: executing a spin with a zero or insufficient balance due to a race condition, a bug in the check, or stale balance caching.

**Vectors**:
- Race: two simultaneous spins, both seeing the old balance.
- Sending a spin with a negative bet in the hope of a code error (win - bet yields a gain when bet < 0).
- Using a stale replay response with the old balance after a withdrawal.

**Risk**: crediting the player without a deposit, financial losses for the platform, licence violations.

---

### 1.7 Client-Side Outcome Manipulation

**Description**: an attempt to alter the displayed or "accepted" spin result on the client.

**Vectors**:
- Substituting the API response in a proxy/DevTools (injecting a custom reel_matrix and large win). If the client only displays the response and does not re-verify it against the server — the user sees a fake win; critical if the balance is updated from client-side data anywhere.
- JS modification: intercepting the response and replacing the `win.amount` field before writing to the store, to display an incorrect balance (provided the backend is not the sole source of truth).
- Manipulating the sending of a win "confirmation" to the server (if such logic erroneously exists).

**Risk**: with the correct architecture (balance and outcome only from the server) — visual deception only; with design errors — there may be an attempt to influence payout accounting.

---

## 2. PROTECTION

### 2.1 Idempotency Keys for each spin request

**Goal**: prevent repeated execution of the same spin (replay and accidental duplicates).

**Implementation**:
- The client generates a unique key for each spin request: `Idempotency-Key: <uuid>` (or a combination of session_id + client_timestamp + nonce).
- The server stores the key in a cache/DB (Redis or an `idempotency_keys` table: key, user_id, response_snapshot, created_at) with a TTL (e.g. 24 hours).
- On the first request with the key — execute the spin, save the response, record the key.
- On a repeated request with the same key — return **the same saved response** without re-executing the spin (HTTP 200 with the same body).
- Requests without a key can be rejected (422) or given no idempotency guarantee.

**Protects against**: Replay Attack, double submission due to double-click or network retries.

---

### 2.2 Server-Side Validation of ALL bet parameters

**Principle**: the server does not trust any client-supplied parameter for business logic. Everything is re-validated and sourced from its own data.

**Checks for POST /spin**:
- **bet.amount**: within the min_bet and max_bet bounds for the given game (from the server-side config); type — number, not string; rounding according to currency rules.
- **bet.currency**: matches the user's/session's currency (from the DB).
- **bet.lines**: a valid value for the game (e.g. fixed at 20 or from an allowed list).
- **session_id**: belongs to the current user_id (from JWT); session is active and has not expired.
- **game_id**: permitted for the platform and jurisdiction; game config is loaded by the server.
- **balance**: balance sufficiency must be obtained from the DB after locking (see below), not from the request.

**Error response**: 422 Unprocessable Entity with a code (e.g. `INVALID_BET`, `BET_BELOW_MIN`) without executing the spin.

---

### 2.3 Database-Level Pessimistic Locking of the balance

**Goal**: eliminate race conditions during debit and credit operations.

**Implementation**:
- When processing a spin: within a single transaction execute `SELECT ... FROM balances WHERE user_id = ? AND currency = ? FOR UPDATE` (pessimistic lock).
- Check `balance >= bet_amount`; if not — rollback, respond with 422.
- Deduct the bet (UPDATE balances SET amount = amount - bet, version = version + 1).
- Record the spin and transactions (bet transaction).
- After computing the outcome — credit the win (UPDATE balances), record the win transaction.
- Commit the transaction.

**Effect**: a second simultaneous spin by the same user will wait for the lock and will see the already updated balance — rejected due to insufficient funds, or one spin per one "unit" of balance.

**Additionally**: optimistic locking by `version` on the balances table to detect conflicts in rare scenarios (e.g. a deposit in another transaction).

---

### 2.4 JWT: RS256 + Short Expiry + Refresh Token Rotation

- **RS256 (or ES256)**: JWT signature is asymmetric. The server signs with the private key and verifies with the public key. Forging a token without the private key is impossible; brute-forcing a secret is not applicable (there is no secret on the verifying side).
- **Short expiry access token**: e.g. 5–15 minutes. Limits the window of use for a stolen token.
- **Refresh token**: a long-lived token (stored in the DB or signed with a separate secret), single-use or family-based. Used only to obtain a new access + refresh pair. After use, the refresh token is invalidated (rotation). If compromised — revocation by list or by family.
- **Prohibition of "alg": "none"**: explicitly set the list of allowed algorithms in the library (e.g. RS256 only). Reject tokens with `alg: none` or without a signature.

---

### 2.5 Rate Limiting: max N spins per second per user_id

**Goal**: reduce damage from bots, scripts, and accidental request floods; mitigate brute force and enumeration.

**Implementation**:
- Request counter for POST /spin (and POST /bonus/trigger if needed) keyed by `user_id` (or `session_id`) in a sliding or fixed window (e.g. 1 second).
- Limit: e.g. no more than 2–5 spins per second per user. Upon exceeding — **429 Too Many Requests** with Retry-After.
- Counter storage: Redis (INCR, EXPIRE) or equivalent.

**Additionally**: global rate limit by IP for unauthenticated requests and by endpoint to protect against DDoS.

---

### 2.6 HMAC Signature of requests (spin_id + timestamp + secret)

**Purpose**: additional integrity and anti-replay for critical requests (an optional layer on top of TLS and idempotency).

**Idea**:
- The server returns a signature after a spin: `HMAC-SHA256(secret, spin_id || timestamp)` in a header or in the body.
- The client, on subsequent requests (e.g. history queries or confirmations), can send this signature to bind it to a specific spin.
- For incoming spin requests: the client can sign `Idempotency-Key + timestamp` and send the `X-Request-Signature` header; the server verifies the signature and rejects it if invalid or if the timestamp is outside the allowed window (replay window restriction).

**Limitation**: the signing secret must be handled carefully on the client (one embedded in an application is still extractable). Makes sense for server-to-server requests or for clients verifying server responses; for browsers the priority is idempotency, TLS, and server-side validation.

---

### 2.7 Certified RNG Audit (BMM, GLI, eCOGRA)

**Goal**: prove to regulators and operators that the RNG and game mathematics comply with fair-play standards and cannot be manipulated.

**Practice**:
- Use of a certified generator (e.g. Mersenne Twister) with documented seed generation.
- Third-party code audit and testing: BMM Compliance, GLI (Gaming Laboratories International), eCOGRA, etc. — distribution verification, absence of bias, seed reproducibility.
- Logging of the seed (or its hash) and spin_id for subsequent result verification.
- Documentation of RTP, volatility, and paytable for each game.

**Protects against**: allegations of result manipulation, licence revocation; increases partner trust.

---

## 3. COMPLIANCE

### 3.1 Responsible Gambling (RG)

**Limits** (user-configurable or mandatory by jurisdiction):
- **Deposit limit**: maximum deposit per day/week/month.
- **Loss limit**: maximum loss per period.
- **Session limit**: continuous play time with a reminder or forced logout.
- **Bet limit**: maximum bet per spin (may coincide with the game's max_bet or be lower).

**Implementation**: checks at deposit and when setting the spin bet; blocking overruns at the API and DB level.

**Self-exclusion**:
- A user can voluntarily block access for a set period (one month, six months, one year, indefinitely).
- In the DB: user status (e.g. `self_excluded`) and end date. At login and at every critical action (spin, deposit) — check; if self-exclusion is active — deny (403) and redirect to the RG page.
- Integration with national registries (e.g. GAMSTOP in the UK), where required — check at registration.

**Additionally**: risk warnings, links to help resources (GamCare, BeGambleAware), display of session time and losses in the HUD.

---

### 3.2 AML (Anti-Money Laundering)

**Monitoring of suspicious patterns**:
- Unusually high bets or game volume relative to the user's history.
- Rapid cycles of deposit → play → withdrawal (layering).
- Play from multiple devices/IPs across different countries within a short period.
- Structuring (many small deposits below the reporting threshold).
- Wins inconsistent with the typical RTP (extreme outliers — rare but possible; mass anomalies — a signal).

**Actions**:
- KYC (identity verification) when limits are exceeded or upon withdrawal above a threshold.
- System flags: risk scoring by rules (regulator-based rules); escalation to the compliance team.
- Logging of transactions and game events for reports and investigations.
- SAR (Suspicious Activity Report) to the financial intelligence unit per jurisdiction.

---

### 3.3 GDPR and spin data retention

**Principles**:
- **Lawfulness, fairness, transparency**: explicit consent/contract for processing game data; privacy policy stating the purposes (contract performance, licence requirements, AML).
- **Purpose limitation**: spin data is stored for contract performance, audit, regulatory requirements, and AML; not used for unrelated purposes without a legal basis.
- **Data minimisation**: store only the necessary fields (user_id, spin_id, bet, win, outcome, timestamp); do not store excess PII in spin logs.
- **Storage limitation**: retention period — per law and licence (often 5–10 years for transactions and game history); after expiry — deletion or anonymisation.
- **Integrity and confidentiality**: DB and backup encryption, role-based access, access auditing.

**Data subject rights**:
- **Access**: the user may request a copy of their spin history (export in a machine-readable format).
- **Rectification**: correction of inaccuracies in personal data (game history is generally not subject to alteration by law; profile data is corrected).
- **Erasure**: "right to be forgotten" with limitations — game and financial data may be subject to retention by law (tax, AML, licence); deletion where the law permits.
- **Portability**: provision of history in a structured format (JSON/CSV) upon request.

**Documentation**: Record of Processing Activities (ROPA), DPA with partners, data breach response procedures (notification of the supervisory authority and users within GDPR timeframes).

---

## Summary table: threat → protection

| Threat                    | Protective measures |
|---------------------------|-------------|
| Replay Attack             | Idempotency keys, HMAC + timestamp window (optional) |
| Race Condition            | Pessimistic balance locking, one transaction per spin |
| Parameter Tampering       | Server-side validation of all parameters, limits from config/DB |
| JWT manipulation          | RS256, prohibition of "none", short expiry, refresh rotation |
| IDOR                      | Ownership check: user_id from JWT, filter by current user |
| Negative balance          | Lock + balance check in transaction, reject when bet > balance |
| Client-side manipulation  | Outcome and balance from server only, client is display only |
| Brute force / abuse       | Rate limiting by user_id/session_id, spin limit per second |
| RNG / game fairness       | Certified RNG (BMM, GLI, eCOGRA), audit and seed logging |

Compliance (RG, AML, GDPR) is ensured through policies, in-code limits, monitoring, and procedures — not by any single technical measure.
