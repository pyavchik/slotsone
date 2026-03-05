import type { RouletteOutcome } from './types';
import { AMERICAN_WHEEL_ORDER } from './constants';

export interface RandomSource {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

export function mapUint32ToIndex(value: number, size: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error('value must be an unsigned 32-bit integer');
  }
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error('size must be a positive integer');
  }

  const max = 0x1_0000_0000;
  const limit = max - (max % size);
  if (value >= limit) {
    throw new Error('value rejected to avoid modulo bias');
  }

  return value % size;
}

function randomUint32(source: RandomSource): number {
  const arr = new Uint32Array(1);
  source.getRandomValues(arr);
  return arr[0] ?? 0;
}

export function getUniformIndex(size: number, source: RandomSource = crypto): number {
  const max = 0x1_0000_0000;
  const limit = max - (max % size);
  let value = randomUint32(source);
  while (value >= limit) {
    value = randomUint32(source);
  }
  return mapUint32ToIndex(value, size);
}

export function getRandomAmericanOutcome(source: RandomSource = crypto): RouletteOutcome {
  const index = getUniformIndex(AMERICAN_WHEEL_ORDER.length, source);
  return AMERICAN_WHEEL_ORDER[index] ?? 0;
}
