# Production-Ready Design Spec & Art Guide: 2D Slot (Premium Tier)

Specification and design guide at the level of top providers. No brands or copying. Implementable in production, 60 FPS on mid-range mobile devices.

**Stack**: Web (TypeScript + PixiJS/Canvas). Assets: Spine 2D, sprite sheets, PNG sequences (After Effects).

---

## A) Art Direction (premium style)

### Theme — 2 options

**Option 1: Luxury / Casino Realism**
- Environment: dark interior, velvet, gold accents, soft key light on the grid.
- Mood: restrained premium feel, "nightclub".
- Reference feel: evening club, high limit room (no copying of specific locations).

**Option 2: Fantasy-Realism**
- Environment: depth (sky/clouds/distance), magical accents (glow, particles), "living" background.
- Mood: epicness + readability of symbols and UI.
- Reference feel: a fairy-tale/mythological world with realistic execution (no specific IPs).

### Color system

| Role | Hex | Usage |
|------|-----|----------------|
| Primary BG | #0D0D12 | Scene background, dimming |
| Secondary BG | #1A1A24 | Panels, cards |
| Surface | #252532 | Idle buttons, input fields |
| Accent | #E8B84A | CTA (Spin), important buttons, gold elements |
| Accent Hover | #F5D06A | Hover on accent buttons |
| Success / Win | #4ADE80 | Win, positive balance |
| Danger / Loss | #F87171 | Errors, insufficient funds |
| Text Primary | #FFFFFF | Headings, balance, bet |
| Text Secondary | #A1A1AA | Labels, RTP, rules |
| Neon / Glow | #00D4FF | Payline highlight, neon on symbols (optional) |

**Contrast rules**: text on background — minimum 4.5:1 (WCAG AA). Accent buttons — contrast to background no less than 3:1.

### Typography

- **Font 1 (headings, balance/win numbers)**: sans-serif, bold/heavy. Example: a family with the weight feel of "Impact" but with normal readability (do not distort).
  - Mobile: 24–32px for balance/win, 18–22px for panel headings.
  - Desktop: 28–40px balance/win, 22–26px headings.
- **Font 2 (body, rules, paytable)**: sans-serif, regular/medium.
  - Mobile: 14–16px body, 12px captions.
  - Desktop: 16–18px body, 14px captions.

Weights: Regular 400, Medium 500, SemiBold 600, Bold 700. No more than two families in one scene.

### UI Materials

- **Glass**: HUD panels — background with blur (if performance allows) or semi-transparent gradient (alpha 0.85–0.95), border 1px rgba(255,255,255,0.15).
- **Metal**: Spin/Auto buttons — gradient (light top, dark bottom), highlight on top edge 1–2px, shadow below button 4–8px blur.
- **Neon**: only for accents (paylines, active symbols) — outer glow 8–16px, blend mode add/screen.
- **Shadows**: UI — drop shadow 4px Y, 8px blur, alpha 0.3; symbols in cells — subtle shadow beneath the symbol to lift it from the background.
- **Depth**: 2–3 layers (scene background → rails/grid frame → symbols → overlays). Z-order explicitly defined in the component specification.

### Symbols (realism and consistency)

- Unified style: either "realistic illustrative" (1–2px dark outline) or "soft 3D" (gradients, subtle volume). Do not mix styles within one game.
- Size in cell: the symbol occupies 75–85% of the cell height by content; padding from edges — for readability and bounce.
- Gloss: one common highlight (gradient or overlay) at the top/side, do not overload.
- Highlights: static top highlight + optional highlight animation on win (sweep across the symbol 200–400 ms).
- Outline: dark 1–2px along the symbol contour to separate it from the cell background; on win — colored (gold/neon) 2–3px, animation 300–500 ms.

---

## B) UI Layout Spec

### Grid and safe area

- **Base canvas**: 1080×1920 (9:16 portrait) — primary; 1920×1080 (16:9) — landscape.
- **Safe area**: 48px inset from edges (9:16) and 56px (16:9) for notches and gestures. Critical content and buttons — inside safe area.
- **Grid**: 12 (logical) columns. Gap between content "columns" 24px (mobile), 32px (desktop at 16:9).

### Component sizes (9:16, 1080×1920)

| Element | Size (px) | Position (from center or edge) |
|---------|-------------|------------------------------|
| ReelGrid (outer frame) | 900×540 | Centered on X, Y = 0 (vertical per layout) |
| Single reel cell | 172×172 (≈5 columns of 172 + gaps) | Inside grid: 5 columns × 3 rows |
| Gap between symbols | 8px | Between cells |
| BetPanel (height) | 160px | Bottom zone, above safe area |
| Spin button | 200×80 (min touch zone 88×88) | In BetPanel, right side |
| Bet +/- buttons | 72×72 | BetPanel |
| AutoSpin button | 120×56 | Next to Spin |
| HUD balance/bet | Text 28px, container ~140×60 | Top, left and right, 48px inset from edge |
| Menu (burger/settings) | 56×56 | Top, corner |
| Sound | 48×48 | Top, corner |

### Sizes (16:9, 1920×1080)

- ReelGrid: 1000×600, cell ~196×196, gap 10px.
- BetPanel height: 120px. Spin: 220×88. Everything else scales proportionally from 9:16 with priority on text readability (min. 14px).

### Button states

| State | Visual | Transition duration |
|-----------|--------|------------------------|
| Idle | Base texture, subtle gradient | — |
| Hover | Highlight +5% brightness, scale 1.02 | 80 ms ease-out |
| Pressed | Scale 0.96, darkening −10% | 60 ms ease-in |
| Disabled | Desaturate ~70%, alpha 0.6 | 150 ms |
| Cooldown (after spin) | No change or subtle pulse (opacity 0.9↔1) until unlocked | Until outcome is received |

All interactive elements: minimum touch zone 88×88 px (9:16).

### Micro-interactions

- **Hover**: scale 1.02, brightness +5%, 80 ms ease-out.
- **Press**: scale 0.96, 60 ms ease-in; on release — return 100 ms ease-out.
- **Bounce (Spin button after a win)**: optionally a subtle scale 1 → 1.05 → 1 over 200 ms (ease-out) when the button reappears.
- **Toggles (AutoSpin, sound)**: toggle — shift/fill 120 ms ease-in-out.

---

## C) Reel Spin Feel (critical)

### Phases of a single reel spin

1. **Start (acceleration)**: 0–150 ms. Easing: ease-out. Visually symbols are already moving at initial speed (not from zero — strip speed is set immediately).
2. **Steady**: 400–800 ms (depends on reel position, see below). Linear downward (or upward) movement, constant speed. Motion blur enabled.
3. **Stop (deceleration)**: 180–220 ms. Easing: ease-out-cubic or custom curve (rapid deceleration at the end). Final position — exactly per outcome (snap to symbol).

### Speeds and delays per reel

- **Strip speed** (in steady): 2500–3500 px/s (at 1080p). Same value for all reels.
- **Start delay** (relative to the first reel): Reel 0: 0 ms; Reel 1: 80 ms; Reel 2: 160 ms; Reel 3: 240 ms; Reel 4: 320 ms. Or: 0, 100, 200, 300, 400 ms for a more "cascading" feel.
- **Stop delay**: Reel 0: stop at T; Reel 1: T+100 ms; Reel 2: T+200 ms; Reel 3: T+300 ms; Reel 4: T+400 ms. Total ~100 ms between stops of adjacent reels (range 80–120 ms).

### Bounce overshoot on stop

- After stopping per outcome: offset in the direction of movement by 4–8 px, then return (spring or ease-out) over 80–120 ms. Overshoot: 1.02–1.05 of the cell size (visually a "settling" motion).
- Tolerance: no more than 8 px offset and 120 ms duration, so as not to interfere with symbol readability.

### Motion blur

- **Option A (shader)**: in PixiJS — simple directional blur (direction 0, −1), strength 2–4 px, only during steady + beginning of stop. Disable 50 ms before final snap.
- **Option B (no shader)**: replace strip with a pre-rendered blurred strip (duplicate symbols, blurred vertically) during steady; 100 ms before stop — smooth crossfade to sharp strip. Budget: 1 additional texture per reel.

### SFX hooks (timings relative to animation)

| Event | Moment | Tolerance (ms) |
|---------|--------|-------------|
| Spin start | Spin press, before first strip movement | 0 |
| Reel tick (optional) | Every 80–100 ms during steady per reel | ±20 |
| Reel stop | Moment of reel snap to final position | 0 … +30 |
| Win present start | After last reel stop | +50 … +100 |
| Big Win trigger | After win amount determined, before overlay entry | 0 … +200 |

---

## D) Win Presentation (as with top providers)

### Winning symbol highlight

- **Activation**: 50 ms after last reel stop. Simultaneously: glow, scale, (optionally) particles.
- **Glow**: outer glow 12–20 px, gold/neon color, alpha 0.6→0.9 over 150 ms (ease-out). Hold 400–600 ms.
- **Pulse**: scale 1 → 1.08 → 1.03 over 250 ms (ease-out), then light hold at 1.03 or return to 1 over 200 ms.
- **Particles**: 4–8 particles per symbol, emitting from symbol center over 200–400 ms; size 4–12 px, fade out. No more than 40 total particles per one win.
- **Highlight sweep**: one pass across the symbol (gradient overlay left to right) over 200–300 ms, starts together with glow.

Timing: glow start 0 ms, scale peak 80 ms, particles 0–300 ms, highlight sweep 50–250 ms. Total duration of "symbol highlight" before showing win amount: 400–600 ms.

### Paylines / Ways trace

- Lines are drawn on top of the grid. Thickness: 4–6 px (mobile), 6–8 px (desktop). Color: gold or neon gradient (#E8B84A → #00D4FF), alpha 0.9.
- **Animation**: "travel" along the line path over 200–350 ms per line (ease-out). Options: stroke dash offset from 1 to 0, or line draw from start to end. Up to 1–2 lines simultaneously; for 3+ — sequentially with 80–100 ms step.
- Disappearance: fade out 200 ms after showing win counter or by timer 1.5–2 s from start.

### Win counter (count-up)

- Start: 400–600 ms after last reel stop (after symbol highlight).
- Duration: 800–1200 ms for amounts up to ~50× bet; 1200–1800 ms for larger (formula: base 600 ms + 30 ms per every 10× bet, cap 2000 ms).
- Easing: ease-out (fast at start, slowing at end). Number update: every 16–33 ms (60–30 FPS), value interpolated.
- **Anticipation**: before count-up start — 100–150 ms pause and subtle container scale 1 → 1.02 (optionally a short "tick" sound).

### Big Win sequence

Thresholds (in ×Bet): **Big Win** 10×, **Mega Win** 25×, **Ultra Win** 100×. Below 10× — only win counter and highlight, no full-screen overlay.

1. **Entry (0–200 ms)**
   - Screen: dim to 0.5–0.6 background brightness over 150 ms.
   - Burst: 8–12 rays/particles from grid center, 150 ms.
   - Overlay ("Big Win" / "Mega Win" / "Ultra Win" logo): scale 0.3→1.1, ease-out-back, 200 ms.

2. **Build-up (200–800 ms)**
   - Particles: confetti/stars from the top of the screen, medium density.
   - Intensification: logo subtle pulse (scale 1.0↔1.05), 400 ms.
   - Win amount appears below the logo, count-up starts (see above).

3. **Finale (after count-up)**
   - Subtle camera shake: 2–4 px offset on X/Y, 2–3 cycles over 200 ms, then decay.
   - Confetti peak: additional burst at the moment count-up ends, 300 ms.
   - Hold screen 600–1000 ms (display final amount).

4. **Exit (600–1000 ms)**
   - Fade out overlay and dimming over 400 ms.
   - Return to game screen: Spin button active again 200 ms after end of fade.

Total Big Win duration: ~3–4 s (excluding long count-up for Ultra).

---

## E) BonusOverlay / Free Spins

### Free Spins intro

- Duration: 3–4 s from appearance to "Start" button or auto-start.
- Key frames:
  - 0 ms: dimming, container appears (fade + scale 0.8→1, 300 ms).
  - 300 ms: "FREE SPINS" heading (scale 0→1, ease-out-back, 250 ms).
  - 600 ms: counter "10" or "15" (digit/card animation, 300 ms).
  - 1200 ms: optional rules (1–2 lines, fade in 200 ms).
  - 2500 ms: "Start" button appears (fade + bounce 200 ms).
- Transition to game: on Start press — fade out overlay 300 ms, then first bonus spin without additional delay.

### Retrigger

- Separate short overlay: 1.5–2 s.
- Scheme: dimming 200 ms → "RETRIGGER!" text + number of additional spins (scale 0.5→1.2→1, 400 ms) → hold 800 ms → fade out 300 ms → return to reels.
- No full "intro", only emphasis on the retrigger event.

### Sticky UI in bonus

- Strip above or below grid: "FREE SPINS 7 / 10" (or "7 left"), "MULTIPLIER x2". Height 48–56 px, semi-transparent background, text 20–24 px. Always visible during bonus spins.
- On retrigger: number updates with subtle animation (scale 1.1→1, 150 ms).

### Skip / disabling animations

- **Skip**: "Skip" button appears 1–2 s after Free Spins intro starts (or after the first winning spin in the bonus — per design). Press — immediate transition to spin/next action. The skip animation does not interrupt mid-frame — transitions to the next logical step.
- Rule: when "Animations" is disabled in settings — Big Win and intro durations are reduced to minimum (e.g. 500 ms dimming + 300 ms text appearance), no confetti or heavy effects. Win counter remains but accelerated (300–500 ms).

---

## F) Asset Pipeline (Spine / AE / Spritesheets)

### Spine 2D

- **Use for**: characters (if any), animated grid frames, glitter/shimmer on symbols, complex win elements (hands, objects). Not for static reel symbols and simple buttons.
- Export: .skel + .atlas (or .json), one skin per variant. Bone animation — up to 30 bones per character; animations up to 60 FPS when needed, otherwise 30 FPS.

### Spritesheets (symbols, UI, VFX)

- **Symbols**: one atlas per theme (e.g. symbols_main_001.png + .json). Symbol cell size in atlas: 256×256 or 512×512 (for 2x). Padding 2–4 px, trim. Names: `reel_symbol_01`, `reel_symbol_02`, … `reel_symbol_12`, `reel_symbol_scatter`, `reel_symbol_wild`.
- **UI**: atlases per screen/zone. Examples: `ui_betpanel_001`, `ui_btn_spin_idle`, `ui_btn_spin_pressed`, `ui_btn_autospin`, `ui_hud_balance_bg`. Buttons — all states in one atlas.
- **VFX**: `vfx_bigwin_burst`, `vfx_particle_star`, `vfx_confetti_*`, `vfx_line_glow`. Separate atlases for heavy effects (Big Win, Free Spins intro).

### After Effects (PNG sequence)

- Use for: Free Spins intro, Big/Mega/Ultra Win, retrigger, complex transitions. Export: PNG sequence, 30 FPS (or 24), alpha, premultiplied. Resolution: 1080×1920 or 1920×1080 per layout.
- Naming: `fs_intro_00000.png` … `fs_intro_00120.png`, `bigwin_entry_00000.png` … Conversion to sprites or frame-by-frame playback in PixiJS (AnimatedSprite).

### Formats and settings

- **PNG**: 8-bit RGBA, premultiplied alpha for correct blending in WebGL. Compression: standard (PNG-8 for flat UI where possible).
- **Atlas sizes**: 2048×2048 primary limit; if exceeded — multiple atlases by zone (symbols, UI, VFX). Max 4096 only when necessary and tested on low-end devices.
- **Scale variants**: 1x (base 1080p), 2x for Retina/high DPI. Naming: `atlas_1x.json` / `atlas_2x.json` or suffix `@2x` in texture name.

### Naming conventions

- Reels: `reel_01_symbol_*`, `reel_symbol_*`.
- UI: `ui_btn_spin_*`, `ui_panel_bet_*`, `ui_hud_*`, `ui_modal_*`.
- VFX: `vfx_bigwin_*`, `vfx_fs_intro_*`, `vfx_particle_*`, `vfx_line_*`.
- Sounds: `sfx_spin_start`, `sfx_reel_stop_01` … `sfx_reel_stop_05`, `sfx_win_small`, `sfx_bigwin`, `sfx_fs_trigger`.

---

## G) Performance & Quality Checklist

### Budgets

- **Draw calls**: target limit up to 30 per frame in a typical scene (grid + HUD + several effects). Batching reel symbols into one draw call where possible.
- **Textures**: total in memory no more than 80–100 MB (at 1x); at 2x — be careful, test on 2 GB RAM devices.
- **Particles**: no more than 80–100 active particles simultaneously (excluding static sprites). During Big Win — temporary peak up to 120, no more than 2 s.

### Rules

- No overdraw: do not render opaque objects on top of each other unnecessarily; draw order — background → grid → symbols → lines → UI → overlays.
- Batching: identical textures/materials — in one batch; symbols from the same atlas — one container with shared texture.
- Mipmaps: disabled for UI (sharpness); enabled for large background textures with 3D or scaling.
- Dynamic quality: if FPS drops below 50 — disable motion blur and reduce particles by 50%; below 40 — disable glow and simplify shaders. Flag in settings: "Low / Medium / High / Auto".

### Accessibility

- Readability: text and button contrast per WCAG AA; minimum font size 12 px (captions).
- Color: do not rely on color alone (e.g. "red = loss"); supplement with an icon or text.
- Sound: "Sound On/Off" toggle in HUD; critical events (Big Win, bonus) duplicated visually.
- Vibration: optional vibration on reel stop and on win (short pattern), only when the setting is enabled and device supports it.

---

## H) Deliverables

### Screen list

1. Game (main screen: grid, HUD, BetPanel, buttons).
2. Paytable / Rules (modal window or separate screen).
3. Settings (sound, vibration, quality, limits — if in game).
4. Free Spins intro (full-screen overlay).
5. Free Spins game (game screen with sticky bonus strip).
6. Big Win / Mega Win / Ultra Win (full-screen overlays).
7. Retrigger (short overlay).
8. AutoSpin settings (modal window: count, stop conditions).

### Animation list

- Reel spin (start, steady, stop) × 5 reels.
- Reel stop bounce (per reel).
- Symbol win highlight (glow, scale, particles, highlight sweep).
- Payline / ways trace (draw, hold, fade).
- Win counter count-up.
- Big Win / Mega / Ultra: entry, build-up, finale, exit.
- Free Spins intro: appearance, heading, counter, Start button.
- Retrigger: appearance of text and number.
- Buttons: idle, hover, pressed, disabled.
- AutoSpin: modal open/close, toggles.
- Paytable: modal open/close, scroll (if needed).

### Timing table (ms)

| Animation | Duration (ms) | Easing |
|----------|--------------------|--------|
| Reel start (per reel delay) | 0, 80, 160, 240, 320 | — |
| Reel steady | 400–800 | linear |
| Reel stop | 180–220 | ease-out-cubic |
| Reel stop bounce | 80–120 | ease-out / spring |
| Reel stop delay (between reels) | 100 | — |
| Symbol win glow in | 150 | ease-out |
| Symbol win scale pulse | 250 | ease-out |
| Payline trace | 200–350 per line | ease-out |
| Win counter (base) | 800–1200 | ease-out |
| Big Win entry | 200 | ease-out-back |
| Big Win build-up | 600 | — |
| Big Win exit fade | 400 | ease-in |
| Free Spins intro total | 3000–4000 | — |
| Retrigger overlay | 1500–2000 | — |
| Button hover | 80 | ease-out |
| Button press | 60 | ease-in |

### Acceptance criteria (visual testing)

- [ ] All reels stop at positions matching the server outcome (pixel-perfect or 1 px tolerance).
- [ ] Delays between reel stops in the range 80–120 ms, visually sequential.
- [ ] Win symbols are highlighted no later than 100 ms after the last stop.
- [ ] Win counter ends at the value equal to the transmitted win amount.
- [ ] Big Win overlay is shown when win ≥ 10× bet; Mega at ≥ 25×; Ultra at ≥ 100×.
- [ ] On 9:16 all buttons are in the safe area and not obscured by notches.
- [ ] Contrast of balance and bet text is no less than 4.5:1 against the background.
- [ ] With "Low" quality enabled, no lag at 60 FPS on the reference device (e.g. iPhone 11 / mid Android).
- [ ] With sound disabled, all visual events remain understandable.

---

## Signature Moments (3 feature variants)

1. **Anticipation glow on two scatters**
   When the first two stopped reels already have two scatters and the third is still spinning: a subtle pulsing glow under the first two scatters and a quiet sound "riser". Duration: until the third reel stops. Makes the "bonus is about to hit" moment recognizable.

2. **Reel slam**
   The last reel (or all five) on stopping delivers not just a bounce but a short "impact": subtle screen darkening for 1 frame (or 16 ms) + micro-shake 1–2 px + one low-frequency sound. Apply only on a winning combination. Reinforces the sense of "weight" on the stop.

3. **Win ladder**
   With multiple winning lines the amounts are shown not as one line but as "steps": each subsequent line adds a row below the previous one with a short appearance animation (slide + fade 80 ms) and a slight increase in the total. Final total at the bottom with count-up. Creates a build-up and readability of "where each amount comes from".

---

## TODO by role

**UI (design)**
- [ ] Finalize 9:16 and 16:9 layouts in Figma (all screens from section H).
- [ ] Define button and panel components with states (idle/hover/pressed/disabled).
- [ ] Prepare typography and spacing specification for dev.

**Art**
- [ ] Confirm art direction (luxury or fantasy) and palette.
- [ ] Deliver symbols in a unified style (size, outline, gloss) + atlases per conventions from section F.
- [ ] Prepare assets for Big Win / Mega / Ultra and Free Spins intro (for AE or Spine).

**Animation**
- [ ] Implement in AE/Spine the Free Spins intro and Big Win sequence; export per timings from section D and the timing table.
- [ ] Define SFX hooks (table in section C) and hand timings to audio.

**Dev**
- [ ] Implement ReelGrid with spin phases (start/steady/stop), delays and bounce per specification C.
- [ ] Implement win presentation (symbol highlight, paylines, count-up) and Big Win overlay integration with thresholds 10×/25×/100×.
- [ ] Implement dynamic quality and batching per section G.

**QA**
- [ ] Verify all Acceptance criteria items (section H).
- [ ] Measure FPS on reference devices (9:16 and 16:9).
- [ ] Verify safe area on real devices with notches and gestures.
