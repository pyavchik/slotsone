/**
 * utils.ts — Shared helper functions for European Roulette.
 */

import { RED_NUMBERS, CHIP_VALUES_DESC } from './constants';

export function betKey(type: string, numbers: number[]): string {
  return `${type}:${[...numbers].sort((a, b) => a - b).join(',')}`;
}

export function numberColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

export function chipImageForAmount(amount: number): string {
  for (const v of CHIP_VALUES_DESC) {
    if (amount >= v) return `/assets/roulette/pro/chip-stack-${v}.png`;
  }
  return '/assets/roulette/pro/chip-stack-1.png';
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function colorHex(color: 'red' | 'black' | 'green'): string {
  if (color === 'red') return '#c0392b';
  if (color === 'green') return '#27ae60';
  return '#1a1a2e';
}
