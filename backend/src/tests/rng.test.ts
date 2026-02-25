import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeededRNG } from '../engine/rng.js';

test('createSeededRNG produces deterministic sequence for same seed', () => {
  const a = createSeededRNG(12345);
  const b = createSeededRNG(12345);

  const seqA = Array.from({ length: 8 }, () => a());
  const seqB = Array.from({ length: 8 }, () => b());

  assert.deepEqual(seqA, seqB);
});

test('createSeededRNG sequences differ for different seeds', () => {
  const a = createSeededRNG(12345);
  const b = createSeededRNG(12346);

  const seqA = Array.from({ length: 8 }, () => a());
  const seqB = Array.from({ length: 8 }, () => b());

  assert.notDeepEqual(seqA, seqB);
});

test('createSeededRNG values are normalized into [0,1)', () => {
  const rng = createSeededRNG(7);
  for (let i = 0; i < 2000; i++) {
    const value = rng();
    assert.ok(value >= 0);
    assert.ok(value < 1);
  }
});
