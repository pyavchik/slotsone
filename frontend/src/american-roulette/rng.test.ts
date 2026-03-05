import { describe, expect, it } from 'vitest';
import { AMERICAN_WHEEL_ORDER } from './constants';
import { getRandomAmericanOutcome, getUniformIndex, mapUint32ToIndex } from './rng';

class MockSource {
  private values: number[];

  constructor(values: number[]) {
    this.values = [...values];
  }

  getRandomValues<T extends ArrayBufferView | null>(array: T): T {
    if (!(array instanceof Uint32Array)) {
      throw new Error('mock supports Uint32Array only');
    }
    const next = this.values.shift();
    if (next == null) {
      throw new Error('mock source exhausted');
    }
    array[0] = next;
    return array;
  }
}

describe('american roulette rng mapping', () => {
  it('maps accepted uint32 values into index bounds', () => {
    const size = AMERICAN_WHEEL_ORDER.length;
    const max = 0x1_0000_0000;
    const limit = max - (max % size);

    expect(mapUint32ToIndex(0, size)).toBe(0);
    expect(mapUint32ToIndex(limit - 1, size)).toBeLessThan(size);
  });

  it('rejects modulo-bias values in direct mapper', () => {
    const size = AMERICAN_WHEEL_ORDER.length;
    const max = 0x1_0000_0000;
    const limit = max - (max % size);

    expect(() => mapUint32ToIndex(limit, size)).toThrow('value rejected to avoid modulo bias');
  });

  it('retries until a valid uniform index is produced', () => {
    const size = AMERICAN_WHEEL_ORDER.length;
    const max = 0x1_0000_0000;
    const limit = max - (max % size);
    const source = new MockSource([limit, 7]);

    expect(getUniformIndex(size, source)).toBe(7);
  });

  it('returns only valid american outcomes', () => {
    const source = new MockSource([0, 1, 2, 3]);
    const seen = new Set<string>();

    for (let i = 0; i < 4; i += 1) {
      const value = getRandomAmericanOutcome(source);
      seen.add(String(value));
      expect(AMERICAN_WHEEL_ORDER).toContain(value);
    }

    expect(seen.size).toBeGreaterThan(1);
  });
});
