# UI/UX Architecture of an Online Slot (iGaming)

Full stack, game loop, components, and client-side protection measures.

---

## 1. TECHNOLOGIES

### 1.1 Reel Rendering (WebGL)

**PixiJS** — the primary choice for 2D slots:

- WebGL (with Canvas fallback) out of the box.
- Symbol sprites as `Texture` from atlases (PNG/JSON).
- A separate `Container` per reel, containing a symbol strip masked to the visible area (5×3 → 3 rows visible).
- Animation: changing `y` or updating symbol positions in a loop (ticker), then "snapping" to the final positions from the outcome.
- ParticleContainer for lights and particles without collision logic.

**Three.js** — for 3D slots:

- Each reel is a group of `Mesh` objects (symbols as planes with textures or 3D models).
- Rotation around an axis (reel rotation), stopping at angles that correspond to the outcome.
- Camera, lighting, post-processing (bloom for "Big Win").

**Recommendation**: for classic 5×3, **PixiJS** is more commonly used (simpler, lighter, faster for 2D). Three.js — when 3D rails and kinematics are required.

---

### 1.2 Shell (HUD): React or Vue

- **React** (or **Vue 3**) — everything outside WebGL: balance, bet, buttons, modals, routing.
- State: global store (Zustand, Pinia, Redux) — balance, bet, autospin, UI lock during spin, last spin result (for paylines and overlays).
- The WebGL canvas (Pixi/Three) is mounted into a single ref (React) or via `vue-pixi` / a custom wrapper: creating an `Application` in `useEffect`/`onMounted`, passing callbacks (onSpinClick) and data (outcome) to the canvas container.

**React + PixiJS combination**:

- One root component owns the `PixiApplication` (ref).
- ReelGrid — either a separate class/module inside that ref, or a component that receives `app` via context.
- Events: "SPIN pressed" → store/spin request → on API response, pass outcome to ReelGrid and start the animation.

---

### 1.3 WebSocket Client

- Connect to `wss://api.example.com/ws/game?token=<JWT>` on game entry.
- Subscribe to channels: `balance`, `game_events` (optional).
- On `balance_updated` — update balance in the store and in the HUD without a page reload.
- Reconnect with exponential backoff, re-authenticate via JWT.
- Spins go through **REST** (POST /spin); WebSocket is only for live updates (balance, notifications), not for substituting spin results.

---

## 2. GAME LOOP

Sequence of steps from clicking SPIN to balance update.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. User clicks SPIN                                                         │
│     → UI: disable SPIN, show "spinning" state                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. Client: POST /api/v1/spin                                               │
│     Body: { session_id, game_id, bet: { amount, currency, lines } }          │
│     Headers: Authorization: Bearer <session_token>                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. Server: validates, runs RNG, calculates outcome, saves to DB             │
│     Response: { spin_id, balance, outcome: { reel_matrix, win, bonus } }     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. Client: receives outcome (authoritative)                                │
│     → Store: set balance from response; set outcome for ReelGrid             │
│     → ReelGrid: start reel animation (spinning)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. Reel animation: each reel stops in sequence (e.g. left to right)        │
│     Final positions MUST match outcome.reel_matrix (no client randomness)   │
│     → Play stop sound per reel; optional anticipation on last reels          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  6. After all reels stopped:                                                │
│     → Paylines: highlight winning lines (from outcome.win.breakdown)        │
│     → Effects: particles, flash, sound for win amount                       │
│     → If win > threshold: "Big Win" overlay animation                       │
│     → If bonus_triggered: BonusOverlay (Free Spins count, etc.)             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  7. Balance already updated from step 3; HUD shows new balance               │
│     → Re-enable SPIN (or trigger next AutoSpin after delay)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Important**:

- The spin result **always** comes from the server. The client does not calculate or substitute the outcome — it only animates the received `reel_matrix` and displays `win` / bonuses.
- Locking the SPIN button during the request and animation prevents double requests and desync.

---

## 3. UI COMPONENTS

### 3.1 ReelGrid (5×3 grid, reel animation)

**Purpose**: displaying symbols and animating "spinning" with a stop at the server-determined outcome.

**Structure (PixiJS)**:

- 5 containers (reels). Each contains a vertical symbol strip: for smooth scrolling, more than 3 symbols are stored (e.g. 5–7), with the visible area clipped by a mask (3 symbols).
- Symbols are sprites from an atlas, keyed by `symbol_id` from the config.

**Animation**:

1. **Spinning**: in a loop (ticker), shift the strip downward (or upward); when a symbol goes past the edge — move it to the opposite end and substitute a "random" symbol from the visual set (for visual purposes only, not for the result).
2. **Stop**: by timer or in sequence (reel 0 → reel 1 → … → reel 4), stop the reel so that the visible zone shows **exactly** the symbols from `outcome.reel_matrix[column]`. Final positions are defined by the server — adjust the scroll offset to match visually.
3. Easing (easeOutQuad / easeOutCubic) on the last pixels for a "soft" stop.

**Props/Input**:

- `outcome: { reel_matrix: string[][] }` — after the API response.
- `onReelStopped?: (reelIndex: number) => void` — for sound/effects per reel.
- `onAllReelsStopped?: () => void` — for showing paylines and overlays.

**States**: idle, spinning, stopping.

---

### 3.2 Paylines (winning lines)

**Purpose**: highlighting the lines on which a winning combination landed.

**Implementation**:

- Lines are defined in the config: an array of paths `[ [reel, row], ... ]` for each line (e.g. 20 lines for 5×3).
- From `outcome.win.breakdown` we know which `line_index` values won and which symbols.
- Draw on top of ReelGrid:
  - **PixiJS**: Graphics — lines (curve or segment) along slot coordinates, color/glow for a winning line.
  - Or a separate layer with pre-rendered line sprites (toggled on/off by index).
- Animation: a brief flash/glow on `onAllReelsStopped`, then a timer to hide or transition to the next step (Big Win overlay).

**Data**: `winningLineIndices: number[]`, `paylinePaths: [reel, row][][]` from the config.

---

### 3.3 BetPanel (bet)

**Elements**:

- Current bet (coins/currency).
- **- / +** buttons or a list of bet levels (e.g. 0.10, 0.20, … 100).
- Display of **min / max** (from the game config after init).
- Currency (from balance/session).

**Behavior**:

- The bet is stored in the store; on change — validated against min/max.
- During a spin and animation the bet panel is usually **disabled**, so the bet cannot be changed before the cycle completes.
- Sent in POST /spin: `bet: { amount: currentBet, currency, lines }`.

---

### 3.4 AutoSpin

**Settings** (in a modal or panel):

- Number of spins: 10, 25, 50, 100, "until cancelled".
- Stop conditions: "stop on win > X", "stop on bonus", "no limit".
- **Start AutoSpin** / **Stop AutoSpin** button.

**Logic**:

- After one spin completes (all reels stopped, effects shown) — a timer (e.g. 1–2 sec), then an automatic call of the same flow: POST /spin with the current bet. The autospin counter decrements.
- Stop when: a stop condition triggers, Stop is pressed, balance is insufficient, a bonus round opens (optionally — pause autospin until the bonus ends).

**UI**: "AutoSpin 47/100" indicator and a Stop button.

---

### 3.5 InfoPanel (paytable, rules)

- **Button (i) or "Paytable"** opens a modal window.
- Content: payout table (symbol × count = multiplier), description of bonuses (Scatter, Free Spins, multipliers), link to full rules (external page or embedded iframe/HTML from config).
- Data can be loaded from CDN (config.paytable_url) or be present in the config after init.

---

### 3.6 BonusOverlay

**Scenarios**:

- **Bonus trigger** (e.g. 3+ Scatter): full-screen overlay "FREE SPINS x10", spin count animation, "Start" button or automatic transition to the first bonus spin.
- **During Free Spins**: counter "7 / 10", multiplier "x2", optionally — a "Skip" button (if the product allows it).
- **Big Win**: when the win exceeds the threshold — "BIG WIN" overlay with the amount and confetti/animation, then close and continue.

**Implementation**: React/Vue components on top of the canvas (z-index), animations via CSS/GSAP or Lottie. Data (spin count, multiplier, amount) comes from the server in the outcome and is stored in the store.

---

## 4. CLIENT-SIDE ANTI-CHEAT

Goal: make manipulation via DevTools and code substitution harder, without creating the illusion of "complete protection" (critical logic and balance — on the server only).

### 4.1 Preventing Result Manipulation

- **Outcome from server only**: the client never generates or overwrites the spin result. ReelGrid receives `reel_matrix` and `win` from the API response and only displays them. Even if the user modifies a variable in the console, the next spin will again come from the server and overwrite the state.
- **Do not store balance only on the client**: balance arrives with every /spin response and via WebSocket; the UI shows the server value. The "enough for the bet" check is duplicated on the server (422 on insufficient funds).
- **Token and requests**: JWT in an httpOnly cookie (where possible) or in memory; do not store a long-lived token in localStorage with open access from the console. Critical actions (spin, withdrawal) only with a valid token and server-side rate limiting.
- **Response integrity**: verify the presence of required fields (`spin_id`, `outcome.reel_matrix`, `balance`). On an incomplete response, do not start the win animation — show an error and reconnect if necessary.

### 4.2 JS Obfuscation

- **Minification + obfuscation** (e.g. Webpack + Terser + an obfuscator such as javascript-obfuscator): variable/function names, strings, control flow (flatten), string splitting. Goal — make it harder to read and precisely modify logic (e.g. replacing the function that parses the outcome).
- **Do not rely on obfuscation alone**: the server remains the source of truth; obfuscation only raises the bar for a quick hack.

### 4.3 Session Fingerprinting

- **Why**: binding a session to a device/browser to detect multi-accounts, suspicious context changes, and partially — bot detection.
- **Data** (collected on the client and sent on init or the first spin):
  - User-Agent, language, timezone, screen resolution, color depth.
  - Canvas fingerprint (drawing text/shapes and hashing pixels).
  - WebGL renderer/vendor (if not hidden).
  - Plugin/font list (where available).
- **Sending**: fingerprint hash in a header (e.g. `X-Client-Fingerprint: <hash>`) or in the request body. The server stores the session_id ↔ fingerprint binding and on change may require re-authentication or log it for anti-fraud.
- **Limitations**: do not block the game solely on a fingerprint change (VPN, cache clear) — use it as a signal combined with other indicators.

### 4.4 Additional Measures

- **DevTools detection**: checking `window.outerWidth - window.innerWidth` or `debugger` in code (easily bypassed, but can slow down an inexperienced user). Do not hard-block the game — only optional logging to the backend.
- **Timings**: the server can verify reasonable intervals between spins (not 0 ms); the client must not send the next spin before receiving the response to the previous one.
- **Rate limiting**: limits on /spin on the server by user_id/session_id to prevent flooding and automated requests.

---

## Stack Summary

| Layer           | Technology                  | Purpose                                  |
|-----------------|-----------------------------|------------------------------------------|
| Reel rendering  | PixiJS (2D) / Three.js (3D) | ReelGrid, symbols, animation             |
| Shell           | React or Vue                | HUD, BetPanel, AutoSpin, modals          |
| Network         | REST (fetch/axios) + WebSocket | Spins, init, live updates             |
| State           | Zustand / Pinia / Redux     | Balance, bet, outcome, autospin          |
| UI animation    | CSS / GSAP / Lottie         | Overlays, buttons, Big Win               |

The game loop is built around the **server outcome**: the client only displays and animates the already-determined result; client-side anti-cheat supplements server-side validation and raises the bar against primitive manipulation.
