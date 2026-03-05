export const AMERICAN_ROULETTE_GAME_ID = 'roulette_american_001';

// American wheel order (clockwise from 0) — 38 pockets including 00
export const AMERICAN_WHEEL_ORDER = [
  0,
  28,
  9,
  26,
  30,
  11,
  7,
  20,
  32,
  17,
  5,
  22,
  34,
  15,
  3,
  24,
  36,
  13,
  1,
  -1, // -1 represents 00 internally
  27,
  10,
  25,
  29,
  12,
  8,
  19,
  31,
  18,
  6,
  21,
  33,
  16,
  4,
  23,
  35,
  14,
  2,
];

/** In the API and DB, 00 is represented as -1 */
export const DOUBLE_ZERO = -1;

export const NUMBER_COLORS: Record<number, 'red' | 'black' | 'green'> = {
  0: 'green',
  [DOUBLE_ZERO]: 'green',
  1: 'red',
  2: 'black',
  3: 'red',
  4: 'black',
  5: 'red',
  6: 'black',
  7: 'red',
  8: 'black',
  9: 'red',
  10: 'black',
  11: 'black',
  12: 'red',
  13: 'black',
  14: 'red',
  15: 'black',
  16: 'red',
  17: 'black',
  18: 'red',
  19: 'red',
  20: 'black',
  21: 'red',
  22: 'black',
  23: 'red',
  24: 'black',
  25: 'red',
  26: 'black',
  27: 'red',
  28: 'black',
  29: 'black',
  30: 'red',
  31: 'black',
  32: 'red',
  33: 'black',
  34: 'red',
  35: 'black',
  36: 'red',
};

export const TABLE_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

const posMap = new Map<number, { row: number; col: number }>();
for (let r = 0; r < TABLE_ROWS.length; r++) {
  for (let c = 0; c < TABLE_ROWS[r]!.length; c++) {
    posMap.set(TABLE_ROWS[r]![c]!, { row: r, col: c });
  }
}

export function getTableNeighbors(n: number): number[] {
  const pos = posMap.get(n);
  if (!pos) return [];
  const neighbors: number[] = [];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of dirs) {
    const nr = pos.row + dr!;
    const nc = pos.col + dc!;
    if (nr >= 0 && nr < 3 && nc >= 0 && nc < 12) {
      neighbors.push(TABLE_ROWS[nr]![nc]!);
    }
  }
  return neighbors;
}

export function areTableAdjacent(a: number, b: number): boolean {
  // 0 and 00 are adjacent to each other and to 1, 2, 3
  if (a === 0 || a === DOUBLE_ZERO || b === 0 || b === DOUBLE_ZERO) {
    const greens = new Set([0, DOUBLE_ZERO]);
    const zeroAdj = new Set([0, DOUBLE_ZERO, 1, 2, 3]);
    if (greens.has(a) && zeroAdj.has(b)) return true;
    if (greens.has(b) && zeroAdj.has(a)) return true;
    return false;
  }
  return getTableNeighbors(a).includes(b);
}

// American roulette has no la partage — all bets lose on 0/00
export const BET_TYPES = {
  straight: { payout: 35, size: 1, maxBet: 100 },
  split: { payout: 17, size: 2, maxBet: 200 },
  street: { payout: 11, size: 3, maxBet: 300 },
  corner: { payout: 8, size: 4, maxBet: 400 },
  topLine: { payout: 6, size: 5, maxBet: 500 }, // 0, 00, 1, 2, 3 — unique to American
  sixLine: { payout: 5, size: 6, maxBet: 500 },
  column: { payout: 2, size: 12, maxBet: 1000 },
  dozen: { payout: 2, size: 12, maxBet: 1000 },
  red: { payout: 1, size: 18, maxBet: 1000 },
  black: { payout: 1, size: 18, maxBet: 1000 },
  even: { payout: 1, size: 18, maxBet: 1000 },
  odd: { payout: 1, size: 18, maxBet: 1000 },
  high: { payout: 1, size: 18, maxBet: 1000 },
  low: { payout: 1, size: 18, maxBet: 1000 },
} as const;

export type AmericanRouletteBetType = keyof typeof BET_TYPES;

export const EVEN_MONEY_TYPES: AmericanRouletteBetType[] = [
  'red',
  'black',
  'even',
  'odd',
  'high',
  'low',
];

export interface AmericanRouletteBetDef {
  type: AmericanRouletteBetType;
  numbers: number[];
  amount: number;
}

export const AMERICAN_ROULETTE_CONFIG = {
  game_id: AMERICAN_ROULETTE_GAME_ID,
  type: 'roulette' as const,
  variant: 'american' as const,
  numbers: 38,
  double_zero: DOUBLE_ZERO,
  min_bet: 0.1,
  max_total_bet: 2000,
  bet_levels: [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100],
  bet_types: BET_TYPES,
  currencies: ['USD'],
  rtp: 94.74, // 5.26% house edge (2/38)
  features: ['top_line'],
  wheel_order: AMERICAN_WHEEL_ORDER,
  number_colors: NUMBER_COLORS,
};
