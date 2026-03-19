import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runTimeMachineSpin,
  runTimeMachineRewindSpin,
  buildTimeMachineIdleMatrix,
} from '../engine/timeMachineEngine.js';
import {
  TM_SYMBOLS,
  TM_REEL_STRIPS,
  TM_BOOSTED_STRIPS,
  TM_PAYTABLE,
  TM_SCATTER_FREE_SPINS,
  TM_LINE_DEFS,
  TM_PAYLINES,
  TM_REELS,
  TM_ROWS,
  MAX_WIN_MULTIPLIER,
} from '../engine/timeMachineConfig.js';

// ── helpers ────────────────────────────────────────────────────────

function countScatters(reelMatrix: string[][]): number {
  let count = 0;
  for (const reel of reelMatrix) {
    for (const symbol of reel) {
      if (symbol === 'VortexScatter') count++;
    }
  }
  return count;
}

function expectedFreeSpins(scatterCount: number): number {
  for (let i = TM_SCATTER_FREE_SPINS.length - 1; i >= 0; i--) {
    const [requiredScatters, freeSpins] = TM_SCATTER_FREE_SPINS[i]!;
    if (scatterCount >= requiredScatters) return freeSpins;
  }
  return 0;
}

// ── Determinism ────────────────────────────────────────────────────

test('runTimeMachineSpin is deterministic with same seed', () => {
  const a = runTimeMachineSpin(1.5, 'USD', TM_PAYLINES, 42);
  const b = runTimeMachineSpin(1.5, 'USD', TM_PAYLINES, 42);
  assert.deepEqual(a, b);
});

test('Different seeds produce different results', () => {
  const a = runTimeMachineSpin(1.5, 'USD', TM_PAYLINES, 1);
  const b = runTimeMachineSpin(1.5, 'USD', TM_PAYLINES, 2);
  // At minimum the seeds differ; with overwhelming probability the matrices differ too.
  assert.notDeepEqual(a.outcome.reel_matrix, b.outcome.reel_matrix);
});

// ── Paytable & Win Calculation ─────────────────────────────────────

test('Payout equals rounded sum of line breakdown', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const { outcome } = runTimeMachineSpin(1.5, 'USD', TM_PAYLINES, seed);
    let sum = 0;
    for (const item of outcome.win.breakdown) {
      sum += item.payout;
    }
    // The engine rounds: Math.round(totalWin * 100) / 100
    // However the cap may reduce totalWin before rounding, so compare after cap.
    const maxWin = 1.5 * MAX_WIN_MULTIPLIER;
    const cappedSum = Math.min(sum, maxWin);
    assert.equal(outcome.win.amount, Math.round(cappedSum * 100) / 100);
  }
});

test('All symbols in outcome are valid TM_SYMBOLS', () => {
  const validSet = new Set<string>(TM_SYMBOLS);
  for (let seed = 1; seed <= 100; seed++) {
    const { outcome } = runTimeMachineSpin(1.5, 'USD', TM_PAYLINES, seed);
    for (const reel of outcome.reel_matrix) {
      for (const sym of reel) {
        assert.ok(validSet.has(sym), `Unexpected symbol: ${sym}`);
      }
    }
  }
});

test('Win amount does not exceed 5000x bet cap', () => {
  const bet = 1.5;
  const cap = bet * MAX_WIN_MULTIPLIER;
  for (let seed = 1; seed <= 1000; seed++) {
    const { outcome } = runTimeMachineSpin(bet, 'USD', TM_PAYLINES, seed);
    assert.ok(
      outcome.win.amount <= cap,
      `Seed ${seed}: win ${outcome.win.amount} exceeds cap ${cap}`
    );
  }
});

// ── Reel Matrix ────────────────────────────────────────────────────

test('Reel matrix is 5x3', () => {
  const { outcome } = runTimeMachineSpin(1.5, 'USD', TM_PAYLINES, 99);
  assert.equal(outcome.reel_matrix.length, TM_REELS);
  for (const reel of outcome.reel_matrix) {
    assert.equal(reel.length, TM_ROWS);
  }
});

test('buildTimeMachineIdleMatrix produces 5x3 matrix', () => {
  const matrix = buildTimeMachineIdleMatrix();
  assert.equal(matrix.length, TM_REELS);
  for (const reel of matrix) {
    assert.equal(reel.length, TM_ROWS);
  }
});

// ── Wild Substitution ──────────────────────────────────────────────

test('CronoWild does not substitute for VortexScatter', () => {
  // Line wins should never report VortexScatter as the winning symbol
  for (let seed = 1; seed <= 200; seed++) {
    const { outcome } = runTimeMachineSpin(1.5, 'USD', TM_PAYLINES, seed);
    for (const item of outcome.win.breakdown) {
      assert.notEqual(
        item.symbol,
        'VortexScatter',
        `Seed ${seed}: VortexScatter should not appear in line wins`
      );
    }
  }
});

test('Line wins only contain valid line indices (0-14)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { outcome } = runTimeMachineSpin(1.5, 'USD', TM_PAYLINES, seed);
    for (const item of outcome.win.breakdown) {
      assert.ok(item.line_index >= 0, `line_index ${item.line_index} < 0`);
      assert.ok(item.line_index <= 14, `line_index ${item.line_index} > 14`);
    }
  }
});

// ── Scatter / Free Spins ───────────────────────────────────────────

test('Free spins triggered correctly for scatter count', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { outcome } = runTimeMachineSpin(1.5, 'USD', TM_PAYLINES, seed);
    const scatterCount = countScatters(outcome.reel_matrix);
    const expected = expectedFreeSpins(scatterCount);

    if (expected === 0) {
      assert.equal(
        outcome.bonus_triggered,
        null,
        `Seed ${seed}: ${scatterCount} scatters should not trigger bonus`
      );
      continue;
    }

    assert.ok(outcome.bonus_triggered, `Seed ${seed}: expected bonus for ${scatterCount} scatters`);
    assert.equal(outcome.bonus_triggered?.type, 'free_spins');
    assert.equal(outcome.bonus_triggered?.free_spins_count, expected);
  }
});

// ── Rewind Spins ───────────────────────────────────────────────────

test('runTimeMachineRewindSpin is deterministic', () => {
  for (const tier of ['safe', 'standard', 'super'] as const) {
    const a = runTimeMachineRewindSpin(1.5, 'USD', TM_PAYLINES, tier, 77);
    const b = runTimeMachineRewindSpin(1.5, 'USD', TM_PAYLINES, tier, 77);
    assert.deepEqual(a, b, `Rewind tier '${tier}' not deterministic`);
  }
});

test('Rewind spin uses different reel strips than base game', () => {
  // With boosted strips (extra wilds), at least one tier should produce
  // a different matrix compared to the base game for the same seed.
  const seed = 42;
  const base = runTimeMachineSpin(1.5, 'USD', TM_PAYLINES, seed);
  let anyDiffers = false;
  for (const tier of ['safe', 'standard', 'super'] as const) {
    const rewind = runTimeMachineRewindSpin(1.5, 'USD', TM_PAYLINES, tier, seed);
    try {
      assert.notDeepEqual(rewind.outcome.reel_matrix, base.outcome.reel_matrix);
      anyDiffers = true;
    } catch {
      // This tier happened to match — continue checking others.
    }
  }
  assert.ok(anyDiffers, 'Expected at least one rewind tier to differ from base game');
});

test('All three rewind tiers produce valid outcomes', () => {
  const validSet = new Set<string>(TM_SYMBOLS);
  for (const tier of ['safe', 'standard', 'super'] as const) {
    const { outcome } = runTimeMachineRewindSpin(1.5, 'USD', TM_PAYLINES, tier, 123);
    assert.equal(outcome.reel_matrix.length, TM_REELS);
    for (const reel of outcome.reel_matrix) {
      assert.equal(reel.length, TM_ROWS);
      for (const sym of reel) {
        assert.ok(validSet.has(sym), `Tier '${tier}': unexpected symbol ${sym}`);
      }
    }
    assert.equal(typeof outcome.win.amount, 'number');
    assert.ok(outcome.win.amount >= 0);
    assert.equal(outcome.win.currency, 'USD');
  }
});

// ── Bet Validation ─────────────────────────────────────────────────

test('Spin with different bet amounts calculates correct payouts', () => {
  const seed = 10;
  const bets = [0.15, 1.5, 15, 150];
  for (const bet of bets) {
    const { outcome } = runTimeMachineSpin(bet, 'USD', TM_PAYLINES, seed);
    const betPerLine = bet / TM_PAYLINES;
    for (const item of outcome.win.breakdown) {
      // Payout should be a positive multiple of betPerLine
      if (item.payout > 0) {
        const ratio = item.payout / betPerLine;
        assert.ok(ratio > 0, `Payout ratio should be positive for bet ${bet}`);
        // Ratio must match one of the paytable multipliers for the given count
        const symIndex = (TM_SYMBOLS as readonly string[]).indexOf(item.symbol);
        const paytableEntry = TM_PAYTABLE[symIndex];
        assert.ok(paytableEntry, `No paytable entry for symbol ${item.symbol}`);
        const expectedMult = paytableEntry[item.count - 3];
        assert.ok(
          Math.abs(ratio - expectedMult!) < 0.0001,
          `Bet ${bet}: expected mult ${expectedMult}, got ${ratio.toFixed(6)}`
        );
      }
    }
  }
});

// ── Config Validation ──────────────────────────────────────────────

test('TM_REEL_STRIPS has 5 reels', () => {
  assert.equal(TM_REEL_STRIPS.length, 5);
});

test('TM_LINE_DEFS has 15 paylines', () => {
  assert.equal(TM_LINE_DEFS.length, 15);
});

test('TM_PAYTABLE has entries for all symbols', () => {
  assert.equal(Object.keys(TM_PAYTABLE).length, TM_SYMBOLS.length);
  for (let i = 0; i < TM_SYMBOLS.length; i++) {
    assert.ok(
      TM_PAYTABLE[i] !== undefined,
      `Missing paytable entry for index ${i} (${TM_SYMBOLS[i]})`
    );
    assert.equal(
      TM_PAYTABLE[i]!.length,
      3,
      `Paytable entry for ${TM_SYMBOLS[i]} should have 3 values`
    );
  }
});

test('TM_BOOSTED_STRIPS has entries for all tiers', () => {
  for (const tier of ['safe', 'standard', 'super']) {
    assert.ok(TM_BOOSTED_STRIPS[tier], `Missing boosted strips for tier '${tier}'`);
    assert.equal(
      TM_BOOSTED_STRIPS[tier]!.length,
      TM_REELS,
      `Tier '${tier}' should have ${TM_REELS} reels`
    );
  }
});

test('Boosted strips have more symbols than base strips', () => {
  for (const tier of ['safe', 'standard', 'super']) {
    const boosted = TM_BOOSTED_STRIPS[tier]!;
    for (let r = 0; r < TM_REELS; r++) {
      assert.ok(
        boosted[r]!.length > TM_REEL_STRIPS[r]!.length,
        `Tier '${tier}', reel ${r}: boosted length (${boosted[r]!.length}) should exceed base (${TM_REEL_STRIPS[r]!.length})`
      );
    }
  }
});
