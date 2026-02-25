import assert from 'node:assert/strict';
import test from 'node:test';
import { runSpin } from '../engine/spinEngine.js';
import { PAYLINES, SCATTER_FREE_SPINS } from '../engine/gameConfig.js';

function countScatters(reelMatrix: string[][]): number {
  let count = 0;
  for (const reel of reelMatrix) {
    for (const symbol of reel) {
      if (symbol === 'Scatter') count++;
    }
  }
  return count;
}

function expectedFreeSpins(scatterCount: number): number {
  for (let i = SCATTER_FREE_SPINS.length - 1; i >= 0; i--) {
    const [requiredScatters, freeSpins] = SCATTER_FREE_SPINS[i]!;
    if (scatterCount >= requiredScatters) return freeSpins;
  }
  return 0;
}

test('runSpin is deterministic with same seed and input', () => {
  const a = runSpin(1, 'USD', PAYLINES, 4);
  const b = runSpin(1, 'USD', PAYLINES, 4);
  assert.deepEqual(a, b);
});

test('runSpin payout equals rounded sum of line breakdown payouts', () => {
  const { outcome } = runSpin(1, 'USD', PAYLINES, 4);

  let sum = 0;
  for (const line of outcome.win.breakdown) {
    sum += line.payout;
    assert.ok(line.line_index >= 0 && line.line_index < PAYLINES);
    assert.ok(line.count >= 3 && line.count <= 5);
  }

  assert.equal(outcome.win.amount, Math.round(sum * 100) / 100);
});

test('seeded spin can trigger free spins bonus', () => {
  const { outcome } = runSpin(1, 'USD', PAYLINES, 28);
  assert.ok(outcome.bonus_triggered);
  assert.equal(outcome.bonus_triggered?.type, 'free_spins');
  assert.equal(outcome.bonus_triggered?.free_spins_count, 5);
});

test('free spins bonus is consistent with scatter count thresholds', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { outcome } = runSpin(1, 'USD', PAYLINES, seed);
    const scatterCount = countScatters(outcome.reel_matrix);
    const expected = expectedFreeSpins(scatterCount);

    if (expected === 0) {
      assert.equal(outcome.bonus_triggered, null);
      continue;
    }

    assert.ok(outcome.bonus_triggered);
    assert.equal(outcome.bonus_triggered?.type, 'free_spins');
    assert.equal(outcome.bonus_triggered?.free_spins_count, expected);
  }
});
