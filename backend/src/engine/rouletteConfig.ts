export const ROULETTE_GAME_ID = 'roulette_european_001';

// European wheel order (clockwise from 0)
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const NUMBER_COLORS: Record<number, 'red' | 'black' | 'green'> = {
  0: 'green',
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

// Table layout: 3 rows × 12 columns (numbers 1-36 in reading order)
// Row 0 (top): 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
// Row 1 (mid): 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
// Row 2 (bot): 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
export const TABLE_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

// Build position lookup: number → {row, col} in TABLE_ROWS
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
  if (a === 0 || b === 0) {
    // 0 is adjacent to 1, 2, 3 for split purposes
    const other = a === 0 ? b : a;
    return other >= 1 && other <= 3;
  }
  return getTableNeighbors(a).includes(b);
}

export const BET_TYPES = {
  straight: { payout: 35, size: 1, maxBet: 100 },
  split: { payout: 17, size: 2, maxBet: 200 },
  street: { payout: 11, size: 3, maxBet: 300 },
  trio: { payout: 11, size: 3, maxBet: 300 },
  corner: { payout: 8, size: 4, maxBet: 400 },
  basket: { payout: 8, size: 4, maxBet: 400 },
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

export type RouletteBetType = keyof typeof BET_TYPES;

export const EVEN_MONEY_TYPES: RouletteBetType[] = ['red', 'black', 'even', 'odd', 'high', 'low'];

export interface RouletteBetDef {
  type: RouletteBetType;
  numbers: number[];
  amount: number;
}

// Announced bet expansion
export function expandAnnouncedBet(name: string, chipValue: number): RouletteBetDef[] {
  switch (name) {
    case 'voisins':
      return expandVoisins(chipValue);
    case 'tiers':
      return expandTiers(chipValue);
    case 'orphelins':
      return expandOrphelins(chipValue);
    default: {
      // neighbors:N:number — e.g., "neighbors:2:17" = 17 ± 2 on wheel
      const match = name.match(/^neighbors:(\d+):(\d+)$/);
      if (match) {
        const spread = parseInt(match[1]!, 10);
        const center = parseInt(match[2]!, 10);
        return expandNeighborBet(center, spread, chipValue);
      }
      return [];
    }
  }
}

function expandVoisins(chip: number): RouletteBetDef[] {
  // 9 chips: 2 on 0/2/3 trio, 1 each on 5 splits, 2 on 25/26/28/29 corner
  return [
    { type: 'trio', numbers: [0, 2, 3], amount: chip * 2 },
    { type: 'split', numbers: [4, 7], amount: chip },
    { type: 'split', numbers: [12, 15], amount: chip },
    { type: 'split', numbers: [18, 21], amount: chip },
    { type: 'split', numbers: [19, 22], amount: chip },
    { type: 'split', numbers: [32, 35], amount: chip },
    { type: 'corner', numbers: [25, 26, 28, 29], amount: chip * 2 },
  ];
}

function expandTiers(chip: number): RouletteBetDef[] {
  // 6 chips: 6 splits
  return [
    { type: 'split', numbers: [5, 8], amount: chip },
    { type: 'split', numbers: [10, 11], amount: chip },
    { type: 'split', numbers: [13, 16], amount: chip },
    { type: 'split', numbers: [23, 24], amount: chip },
    { type: 'split', numbers: [27, 30], amount: chip },
    { type: 'split', numbers: [33, 36], amount: chip },
  ];
}

function expandOrphelins(chip: number): RouletteBetDef[] {
  // Orphelins à Cheval: 5 chips — 1 straight + 4 splits
  return [
    { type: 'straight', numbers: [1], amount: chip },
    { type: 'split', numbers: [6, 9], amount: chip },
    { type: 'split', numbers: [14, 17], amount: chip },
    { type: 'split', numbers: [17, 20], amount: chip },
    { type: 'split', numbers: [31, 34], amount: chip },
  ];
}

function expandNeighborBet(center: number, spread: number, chip: number): RouletteBetDef[] {
  const idx = WHEEL_ORDER.indexOf(center);
  if (idx === -1) return [];
  const bets: RouletteBetDef[] = [];
  for (let i = -spread; i <= spread; i++) {
    const wi = (((idx + i) % 37) + 37) % 37;
    bets.push({ type: 'straight', numbers: [WHEEL_ORDER[wi]!], amount: chip });
  }
  return bets;
}

export const ROULETTE_CONFIG = {
  game_id: ROULETTE_GAME_ID,
  type: 'roulette' as const,
  variant: 'european' as const,
  numbers: 37,
  min_bet: 0.1,
  max_total_bet: 2000,
  bet_levels: [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100],
  bet_types: BET_TYPES,
  currencies: ['USD'],
  rtp: 97.3,
  features: ['la_partage', 'announced_bets', 'neighbor_bets'],
  wheel_order: WHEEL_ORDER,
  number_colors: NUMBER_COLORS,
};
