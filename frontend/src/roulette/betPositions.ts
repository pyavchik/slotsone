/**
 * betPositions.ts — Precomputed inside-bet hit zones for the roulette table overlay.
 *
 * All positions are in percentages relative to the number grid area
 * (columns 1-12, rows 0-2).
 */

import type { RouletteBetType } from '@/api';
import { TABLE_ROWS } from './constants';

export interface BetPosition {
  type: RouletteBetType;
  numbers: number[];
  /** CSS left % relative to number grid */
  left: number;
  /** CSS top % relative to number grid */
  top: number;
  /** CSS width % */
  width: number;
  /** CSS height % */
  height: number;
  /** z-index priority */
  zIndex: number;
}

const COL_W = 100 / 12; // ~8.333%
const ROW_H = 100 / 3; // ~33.333%
const HIT_W = COL_W * 0.45;
const HIT_H = ROW_H * 0.4;

// Build number -> {row, col} lookup
const posMap = new Map<number, { row: number; col: number }>();
for (let r = 0; r < TABLE_ROWS.length; r++) {
  for (let c = 0; c < TABLE_ROWS[r]!.length; c++) {
    posMap.set(TABLE_ROWS[r]![c]!, { row: r, col: c });
  }
}

const positions: BetPosition[] = [];

// --- Splits (horizontal: same column, adjacent rows) ---
for (let col = 0; col < 12; col++) {
  for (let row = 0; row < 2; row++) {
    const n1 = TABLE_ROWS[row]![col]!;
    const n2 = TABLE_ROWS[row + 1]![col]!;
    positions.push({
      type: 'split',
      numbers: [n1, n2].sort((a, b) => a - b),
      left: col * COL_W + COL_W / 2 - HIT_W / 2,
      top: (row + 1) * ROW_H - HIT_H / 2,
      width: HIT_W,
      height: HIT_H,
      zIndex: 3,
    });
  }
}

// --- Splits (vertical: same row, adjacent columns) ---
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 11; col++) {
    const n1 = TABLE_ROWS[row]![col]!;
    const n2 = TABLE_ROWS[row]![col + 1]!;
    positions.push({
      type: 'split',
      numbers: [n1, n2].sort((a, b) => a - b),
      left: (col + 1) * COL_W - HIT_W / 2,
      top: row * ROW_H + ROW_H / 2 - HIT_H / 2,
      width: HIT_W,
      height: HIT_H,
      zIndex: 3,
    });
  }
}

// --- Splits with zero: 0-1, 0-2, 0-3 ---
[1, 2, 3].forEach((n) => {
  const p = posMap.get(n);
  if (!p) return;
  positions.push({
    type: 'split',
    numbers: [0, n],
    left: -HIT_W / 2,
    top: p.row * ROW_H + ROW_H / 2 - HIT_H / 2,
    width: HIT_W,
    height: HIT_H,
    zIndex: 3,
  });
});

// --- Streets (3 numbers in same column) ---
for (let col = 0; col < 12; col++) {
  const nums = [TABLE_ROWS[0]![col]!, TABLE_ROWS[1]![col]!, TABLE_ROWS[2]![col]!].sort(
    (a, b) => a - b
  );
  positions.push({
    type: 'street',
    numbers: nums,
    left: col * COL_W + COL_W * 0.15,
    top: 3 * ROW_H - HIT_H * 0.7,
    width: COL_W * 0.7,
    height: HIT_H * 0.7,
    zIndex: 2,
  });
}

// --- Corners (2x2 block at intersections) ---
for (let row = 0; row < 2; row++) {
  for (let col = 0; col < 11; col++) {
    const nums = [
      TABLE_ROWS[row]![col]!,
      TABLE_ROWS[row]![col + 1]!,
      TABLE_ROWS[row + 1]![col]!,
      TABLE_ROWS[row + 1]![col + 1]!,
    ].sort((a, b) => a - b);
    positions.push({
      type: 'corner',
      numbers: nums,
      left: (col + 1) * COL_W - HIT_W / 2,
      top: (row + 1) * ROW_H - HIT_H / 2,
      width: HIT_W,
      height: HIT_H,
      zIndex: 4,
    });
  }
}

// --- Six Lines (two adjacent streets) ---
for (let col = 0; col < 11; col++) {
  const nums = [
    TABLE_ROWS[0]![col]!,
    TABLE_ROWS[1]![col]!,
    TABLE_ROWS[2]![col]!,
    TABLE_ROWS[0]![col + 1]!,
    TABLE_ROWS[1]![col + 1]!,
    TABLE_ROWS[2]![col + 1]!,
  ].sort((a, b) => a - b);
  positions.push({
    type: 'sixLine',
    numbers: nums,
    left: (col + 1) * COL_W - HIT_W / 2,
    top: 3 * ROW_H - HIT_H * 0.7,
    width: HIT_W,
    height: HIT_H * 0.7,
    zIndex: 2,
  });
}

// --- Trios: [0,1,2] and [0,2,3] ---
positions.push({
  type: 'trio',
  numbers: [0, 1, 2],
  left: -HIT_W / 2,
  top: 2 * ROW_H - HIT_H / 2,
  width: HIT_W,
  height: HIT_H,
  zIndex: 5,
});

positions.push({
  type: 'trio',
  numbers: [0, 2, 3],
  left: -HIT_W / 2,
  top: ROW_H - HIT_H / 2,
  width: HIT_W,
  height: HIT_H,
  zIndex: 5,
});

// --- Basket: [0,1,2,3] ---
positions.push({
  type: 'basket',
  numbers: [0, 1, 2, 3],
  left: -HIT_W * 0.8,
  top: ROW_H + ROW_H / 2 - HIT_H / 2,
  width: HIT_W * 0.8,
  height: HIT_H,
  zIndex: 6,
});

export const BET_POSITIONS = positions;
