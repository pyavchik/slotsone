export const GAME_ID = 'slot_mega_fortune_001';

export const REELS = 5;
export const ROWS = 3;
export const PAYLINES = 20;

// Symbol ids (match client display)
export const SYMBOLS = ['10', 'J', 'Q', 'K', 'A', 'Star', 'Scatter', 'Wild'] as const;
export type SymbolId = (typeof SYMBOLS)[number];

// Reel strips: each reel is array of symbol indices (0 = SYMBOLS[0] = '10', etc.)
// We use weighted distribution for RTP; here simplified strips.
const S = SYMBOLS;
const I = (id: string) => S.indexOf(id as SymbolId);
const strip = (ids: string[]) => ids.map((id) => I(id));

export const REEL_STRIPS: number[][] = [
  strip([
    '10',
    'J',
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Star',
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'Scatter',
    'A',
    '10',
    'J',
    'Q',
    'Wild',
    'K',
    'A',
  ]),
  strip([
    'J',
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'Star',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Scatter',
    'Q',
    'K',
    'A',
    '10',
    'J',
  ]),
  strip([
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Star',
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'Scatter',
    'A',
    '10',
    'J',
    'Q',
  ]),
  strip([
    'K',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'Star',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'A',
    '10',
    'Scatter',
    'J',
    'Q',
    'K',
  ]),
  strip([
    'A',
    '10',
    'J',
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Star',
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Q',
    'Scatter',
    'K',
    'A',
  ]),
];

// Paytable: symbol index -> [payout per line for 3, 4, 5 of a kind] (multiplier of bet per line)
// Index 0='10', 1=J, 2=Q, 3=K, 4=A, 5=Star, 6=Scatter, 7=Wild
export const PAYTABLE: Record<number, [number, number, number]> = {
  0: [0.2, 0.5, 2], // 10
  1: [0.2, 0.5, 2.5], // J
  2: [0.3, 0.8, 3], // Q
  3: [0.3, 1, 4], // K
  4: [0.5, 1.5, 5], // A
  5: [0.5, 2, 10], // Star
  6: [0, 0, 0], // Scatter (pays by count, not lines)
  7: [0, 0, 0], // Wild (substitutes)
};

// Scatter: 3 = 5 FS, 4 = 10 FS, 5 = 20 FS (or similar)
export const SCATTER_FREE_SPINS: [number, number][] = [
  [3, 5],
  [4, 10],
  [5, 20],
];

// Line definitions: 20 lines, each is [reel0_row, reel1_row, reel2_row, reel3_row, reel4_row]
// Rows 0=top, 1=mid, 2=bottom
export const LINE_DEFS: number[][] = [
  [1, 1, 1, 1, 1], // line 0: middle
  [0, 0, 0, 0, 0], // line 1: top
  [2, 2, 2, 2, 2], // line 2: bottom
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 2, 1, 2, 0],
];

export const MIN_BET = 0.1;
export const MAX_BET = 100;
export const BET_LEVELS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 100];
export const CURRENCY = 'USD';
export const DEFAULT_BALANCE = 1000;
