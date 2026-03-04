/**
 * constants.ts — Centralized constants for European Roulette.
 */

/* ------------------------------------------------------------------ */
/*  Wheel order (European single-zero, 37 pockets)                    */
/* ------------------------------------------------------------------ */

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

/* ------------------------------------------------------------------ */
/*  Number sets                                                        */
/* ------------------------------------------------------------------ */

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const BLACK_NUMBERS = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
]);

export const EVEN_NUMBERS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36];
export const ODD_NUMBERS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
export const LOW_NUMBERS = Array.from({ length: 18 }, (_, i) => i + 1);
export const HIGH_NUMBERS = Array.from({ length: 18 }, (_, i) => i + 19);

export const COLUMN_1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
export const COLUMN_2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
export const COLUMN_3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];

export const DOZEN_1 = Array.from({ length: 12 }, (_, i) => i + 1);
export const DOZEN_2 = Array.from({ length: 12 }, (_, i) => i + 13);
export const DOZEN_3 = Array.from({ length: 12 }, (_, i) => i + 25);

export const ALL_NUMBERS = Array.from({ length: 37 }, (_, i) => i);

/* ------------------------------------------------------------------ */
/*  Table layout: 3 rows x 12 columns                                 */
/* ------------------------------------------------------------------ */

/** Row 0 (top): 3,6,9…36 — Row 1 (mid): 2,5,8…35 — Row 2 (bot): 1,4,7…34 */
export const TABLE_ROWS: number[][] = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

/* ------------------------------------------------------------------ */
/*  Chip values                                                        */
/* ------------------------------------------------------------------ */

export const CHIP_VALUES = [1, 5, 10, 25, 50, 100] as const;
export const CHIP_VALUES_DESC = [100, 50, 25, 10, 5, 1] as const;

/* ------------------------------------------------------------------ */
/*  Game ID                                                            */
/* ------------------------------------------------------------------ */

export const GAME_ID = 'roulette_european_001';

/* ------------------------------------------------------------------ */
/*  Segment geometry                                                   */
/* ------------------------------------------------------------------ */

export const SEGMENT_ANGLE = 360 / 37;

/* ------------------------------------------------------------------ */
/*  Theme tokens                                                       */
/* ------------------------------------------------------------------ */

export const THEME = {
  gold: '#c8a04e',
  goldLight: '#f6be57',
  goldBright: '#ffd700',
  feltGreen: '#1a5c32',
  red: '#c0392b',
  black: '#1a1a2e',
  green: '#27ae60',
  bg: '#0d0704',
  textPrimary: '#f4ead8',
  textMuted: '#8b7355',
} as const;

export const COLOR_MAP: Record<string, string> = {
  red: THEME.red,
  black: THEME.black,
  green: THEME.green,
};
