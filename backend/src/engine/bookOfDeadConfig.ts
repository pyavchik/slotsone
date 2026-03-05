export const BOD_GAME_ID = 'slot_book_of_dead_001';

export const BOD_REELS = 5;
export const BOD_ROWS = 3;
export const BOD_PAYLINES = 10;

// Symbol ids
export const BOD_SYMBOLS = [
  'RichWilde',
  'Osiris',
  'Anubis',
  'Horus',
  'A',
  'K',
  'Q',
  'J',
  '10',
  'Book',
] as const;
export type BodSymbolId = (typeof BOD_SYMBOLS)[number];

const S = BOD_SYMBOLS;
const I = (id: string) => S.indexOf(id as BodSymbolId);
const strip = (ids: string[]) => ids.map((id) => I(id));

// Reel strips (~26-30 symbols per reel, weighted for ~96.21% RTP at high volatility)
export const BOD_REEL_STRIPS: number[][] = [
  // Reel 1 (26 symbols)
  strip([
    '10',
    'J',
    'Q',
    'K',
    'A',
    'Horus',
    '10',
    'J',
    'Q',
    'K',
    'Anubis',
    '10',
    'J',
    'Q',
    'K',
    'A',
    'Osiris',
    '10',
    'J',
    'RichWilde',
    'Q',
    'K',
    'A',
    'Book',
    '10',
    'J',
  ]),
  // Reel 2 (28 symbols)
  strip([
    'J',
    'Q',
    'K',
    'A',
    '10',
    'Horus',
    'J',
    'Q',
    'K',
    '10',
    'Anubis',
    'J',
    'Q',
    'K',
    'A',
    '10',
    'Osiris',
    'J',
    'Q',
    'K',
    'A',
    '10',
    'RichWilde',
    'J',
    'Q',
    'Book',
    'K',
    'A',
  ]),
  // Reel 3 (28 symbols)
  strip([
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Horus',
    'Q',
    'K',
    '10',
    'J',
    'Anubis',
    'Q',
    'K',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'Osiris',
    'A',
    '10',
    'J',
    'RichWilde',
    'Q',
    'K',
    'Book',
    '10',
    'J',
  ]),
  // Reel 4 (28 symbols)
  strip([
    'K',
    'A',
    '10',
    'J',
    'Q',
    'Horus',
    'K',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'Anubis',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'A',
    'Osiris',
    '10',
    'J',
    'Q',
    'RichWilde',
    'K',
    'Book',
    'A',
    '10',
  ]),
  // Reel 5 (26 symbols)
  strip([
    'A',
    '10',
    'J',
    'Q',
    'K',
    'Horus',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'Anubis',
    'A',
    '10',
    'J',
    'Q',
    'K',
    'Osiris',
    'A',
    '10',
    'RichWilde',
    'J',
    'Q',
    'K',
    'Book',
    'A',
  ]),
];

// Paytable: symbol index -> [payout for 2-of-a-kind, 3, 4, 5] as multipliers of bet-per-line
// RichWilde pays for 2+, all others pay for 3+
// Index: 0=RichWilde, 1=Osiris, 2=Anubis, 3=Horus, 4=A, 5=K, 6=Q, 7=J, 8=10, 9=Book
export const BOD_PAYTABLE: Record<number, [number, number, number, number]> = {
  0: [5, 30, 100, 500], // RichWilde
  1: [0, 5, 40, 200], // Osiris
  2: [0, 5, 30, 150], // Anubis
  3: [0, 5, 25, 100], // Horus
  4: [0, 5, 25, 100], // A
  5: [0, 5, 20, 75], // K
  6: [0, 3, 15, 50], // Q
  7: [0, 3, 15, 50], // J
  8: [0, 3, 10, 40], // 10
  9: [0, 0, 0, 0], // Book (scatter/wild — pays by count, not lines)
};

// Scatter free spins: 3+ Books = 10 free spins (retrigger same)
export const BOD_SCATTER_FREE_SPINS: [number, number][] = [[3, 10]];

// 10 payline definitions for 5x3 grid
// Rows: 0=top, 1=mid, 2=bottom
export const BOD_LINE_DEFS: number[][] = [
  [1, 1, 1, 1, 1], // line 1: middle row
  [0, 0, 0, 0, 0], // line 2: top row
  [2, 2, 2, 2, 2], // line 3: bottom row
  [0, 0, 1, 2, 2], // line 4: V shape
  [2, 2, 1, 0, 0], // line 5: inverted V
  [0, 1, 2, 1, 0], // line 6: zigzag down-up
  [2, 1, 0, 1, 2], // line 7: zigzag up-down
  [1, 0, 0, 0, 1], // line 8: shallow V top
  [1, 2, 2, 2, 1], // line 9: shallow V bottom
  [0, 1, 1, 1, 0], // line 10: hat shape
];

export const BOD_MIN_BET = 0.1;
export const BOD_MAX_BET = 100;
export const BOD_BET_LEVELS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 100];
export const BOD_CURRENCY = 'USD';
