import { createSeededRNG, getRandomSeed } from './rng.js';
import {
  REELS,
  ROWS,
  PAYLINES,
  SYMBOLS,
  REEL_STRIPS,
  PAYTABLE,
  SCATTER_FREE_SPINS,
  LINE_DEFS,
  type SymbolId,
} from './gameConfig.js';

export type ReelMatrix = string[][]; // [reel][row] -> symbol id string

export interface WinBreakdownItem {
  type: 'line';
  line_index: number;
  symbol: string;
  count: number;
  payout: number;
}

export interface SpinOutcome {
  reel_matrix: ReelMatrix;
  win: { amount: number; currency: string; breakdown: WinBreakdownItem[] };
  bonus_triggered: {
    type: 'free_spins';
    free_spins_count: number;
    bonus_round_id: string;
    multiplier: number;
  } | null;
}

function getSymbolId(symbolIndex: number): string {
  return SYMBOLS[symbolIndex] ?? '10';
}

/**
 * Build outcome matrix from RNG. Each reel stops at a random position in its strip.
 */
function buildReelMatrix(rng: () => number): ReelMatrix {
  const matrix: ReelMatrix = [];
  for (let r = 0; r < REELS; r++) {
    const strip = REEL_STRIPS[r]!;
    const pos = Math.floor(rng() * strip.length);
    const col: string[] = [];
    for (let row = 0; row < ROWS; row++) {
      const idx = (pos + row) % strip.length;
      col.push(getSymbolId(strip[idx]!));
    }
    matrix.push(col);
  }
  return matrix;
}

/** Evaluate line: left to right, count matching symbols (wild substitutes). Return [symbolIndex, count]. */
function evaluateLine(
  matrix: ReelMatrix,
  line: number[],
  wildIndex: number
): { symbolIndex: number; count: number } | null {
  let count = 0;
  let symbol: number | null = null;
  for (let r = 0; r < REELS; r++) {
    const row = line[r]!;
    const symStr = matrix[r]?.[row];
    if (!symStr) break;
    const symIdx = SYMBOLS.indexOf(symStr as SymbolId);
    if (symIdx === wildIndex) {
      count++;
      continue;
    }
    if (symbol === null) symbol = symIdx;
    if (symIdx !== symbol) break;
    count++;
  }
  if (count < 3 || symbol === null) return null;
  return { symbolIndex: symbol, count };
}

/** Count scatters in matrix (any position). */
function countScatters(matrix: ReelMatrix): number {
  const scatterId = 'Scatter';
  let n = 0;
  for (let r = 0; r < REELS; r++) {
    for (let row = 0; row < ROWS; row++) {
      if (matrix[r]?.[row] === scatterId) n++;
    }
  }
  return n;
}

/** Get free spins count for scatter count. */
function getFreeSpinsForScatters(count: number): number {
  for (let i = SCATTER_FREE_SPINS.length - 1; i >= 0; i--) {
    if (count >= SCATTER_FREE_SPINS[i]![0]) return SCATTER_FREE_SPINS[i]![1]!;
  }
  return 0;
}

const WILD_INDEX = SYMBOLS.indexOf('Wild');

export function runSpin(
  betAmount: number,
  currency: string,
  activeLines: number = PAYLINES,
  seed?: number
): { outcome: SpinOutcome; seedUsed: number } {
  const seedUsed = seed ?? getRandomSeed();
  const rng = createSeededRNG(seedUsed);
  const normalizedLines = Math.max(1, Math.min(PAYLINES, Math.floor(activeLines)));

  const reel_matrix = buildReelMatrix(rng);

  const breakdown: WinBreakdownItem[] = [];
  let totalWin = 0;
  const betPerLine = betAmount / normalizedLines;

  for (let lineIndex = 0; lineIndex < Math.min(normalizedLines, LINE_DEFS.length); lineIndex++) {
    const line = LINE_DEFS[lineIndex]!;
    const result = evaluateLine(reel_matrix, line, WILD_INDEX);
    if (!result) continue;
    const pay = PAYTABLE[result.symbolIndex];
    if (!pay) continue;
    const mult = pay[result.count - 3]; // 3->0, 4->1, 5->2
    if (mult === undefined || mult <= 0) continue;
    const payout = betPerLine * mult;
    totalWin += payout;
    breakdown.push({
      type: 'line',
      line_index: lineIndex,
      symbol: getSymbolId(result.symbolIndex),
      count: result.count,
      payout,
    });
  }

  const scatterCount = countScatters(reel_matrix);
  const freeSpinsCount = getFreeSpinsForScatters(scatterCount);
  const bonus_triggered =
    freeSpinsCount > 0
      ? {
          type: 'free_spins' as const,
          free_spins_count: freeSpinsCount,
          bonus_round_id: `br_${seedUsed}`,
          multiplier: 1,
        }
      : null;

  return {
    outcome: {
      reel_matrix,
      win: { amount: Math.round(totalWin * 100) / 100, currency, breakdown },
      bonus_triggered,
    },
    seedUsed,
  };
}
