import { randomFillSync } from 'node:crypto';

/**
 * Seeded PRNG (Mulberry32) for deterministic outcomes.
 * For certified use replace with Mersenne Twister (MT19937).
 */
export function createSeededRNG(seed: number): () => number {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0; // mulberry32
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getRandomSeed(): number {
  const buf = new Uint32Array(1);
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    globalThis.crypto.getRandomValues(buf);
    return buf[0]!;
  }

  // Fallback for runtimes without Web Crypto global.
  randomFillSync(buf);
  return buf[0]!;
}
