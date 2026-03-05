import type { BetSpot, RouletteOutcome } from './types';

export const STARTING_BALANCE = 10_000;
export const CHIP_DENOMINATIONS = [1, 5, 10, 25, 100, 500] as const;

export const AMERICAN_WHEEL_ORDER: RouletteOutcome[] = [
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
  '00',
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

const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36] as const;
const BLACKS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35] as const;

export const RED_NUMBERS = new Set<number>(REDS);
export const BLACK_NUMBERS = new Set<number>(BLACKS);

export const NUMBER_COLOR_MAP: Record<string, 'red' | 'black' | 'green'> = {
  '0': 'green',
  '00': 'green',
};

for (let n = 1; n <= 36; n += 1) {
  NUMBER_COLOR_MAP[String(n)] = RED_NUMBERS.has(n) ? 'red' : 'black';
}

export function getOutcomeColor(outcome: RouletteOutcome): 'red' | 'black' | 'green' {
  return NUMBER_COLOR_MAP[String(outcome)];
}

const NUMBERS_1_TO_36 = Array.from({ length: 36 }, (_, i) => i + 1);
const OUTCOMES_1_TO_36 = NUMBERS_1_TO_36 as RouletteOutcome[];

export const TABLE_ROWS: number[][] = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

const COLUMN_1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34] as RouletteOutcome[];
const COLUMN_2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35] as RouletteOutcome[];
const COLUMN_3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36] as RouletteOutcome[];

const DOZEN_1 = Array.from({ length: 12 }, (_, i) => i + 1) as RouletteOutcome[];
const DOZEN_2 = Array.from({ length: 12 }, (_, i) => i + 13) as RouletteOutcome[];
const DOZEN_3 = Array.from({ length: 12 }, (_, i) => i + 25) as RouletteOutcome[];

const EVEN = OUTCOMES_1_TO_36.filter((n) => Number(n) % 2 === 0);
const ODD = OUTCOMES_1_TO_36.filter((n) => Number(n) % 2 === 1);
const LOW = OUTCOMES_1_TO_36.filter((n) => Number(n) >= 1 && Number(n) <= 18);
const HIGH = OUTCOMES_1_TO_36.filter((n) => Number(n) >= 19 && Number(n) <= 36);

export const BASE_BET_SPOTS: BetSpot[] = [
  { id: 'red', type: 'red', label: 'RED', outcomes: [...REDS], payout: 1 },
  { id: 'black', type: 'black', label: 'BLACK', outcomes: [...BLACKS], payout: 1 },
  { id: 'even', type: 'even', label: 'EVEN', outcomes: EVEN, payout: 1 },
  { id: 'odd', type: 'odd', label: 'ODD', outcomes: ODD, payout: 1 },
  { id: 'low', type: 'low', label: '1-18', outcomes: LOW, payout: 1 },
  { id: 'high', type: 'high', label: '19-36', outcomes: HIGH, payout: 1 },
  { id: 'dozen1', type: 'dozen1', label: '1st 12', outcomes: DOZEN_1, payout: 2 },
  { id: 'dozen2', type: 'dozen2', label: '2nd 12', outcomes: DOZEN_2, payout: 2 },
  { id: 'dozen3', type: 'dozen3', label: '3rd 12', outcomes: DOZEN_3, payout: 2 },
  { id: 'column1', type: 'column1', label: '1st Col', outcomes: COLUMN_1, payout: 2 },
  { id: 'column2', type: 'column2', label: '2nd Col', outcomes: COLUMN_2, payout: 2 },
  { id: 'column3', type: 'column3', label: '3rd Col', outcomes: COLUMN_3, payout: 2 },
];

export const STRAIGHT_SPOTS: BetSpot[] = [
  { id: 'straight-0', type: 'straight', label: '0', outcomes: [0], payout: 35 },
  { id: 'straight-00', type: 'straight', label: '00', outcomes: ['00'], payout: 35 },
  ...NUMBERS_1_TO_36.map((n) => ({
    id: `straight-${n}`,
    type: 'straight' as const,
    label: String(n),
    outcomes: [n as RouletteOutcome],
    payout: 35,
  })),
];

export const BET_SPOT_MAP = new Map<string, BetSpot>(
  [...BASE_BET_SPOTS, ...STRAIGHT_SPOTS].map((spot) => [spot.id, spot])
);

export const THEME = {
  bg0: '#070608',
  bg1: '#0b0a0f',
  panel: 'rgba(20,18,26,0.72)',
  gold: '#d7b46a',
  gold2: '#a57c2a',
  text: '#f3efe6',
  muted: 'rgba(243,239,230,0.72)',
  red: '#b21f2d',
  black: '#141118',
  green: '#1f8a5b',
} as const;
