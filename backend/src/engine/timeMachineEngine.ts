import { createSeededRNG, getRandomSeed } from './rng.js';
import {
  TM_REELS,
  TM_ROWS,
  TM_PAYLINES,
  TM_SYMBOLS,
  TM_REEL_STRIPS,
  TM_BOOSTED_STRIPS,
  TM_PAYTABLE,
  TM_SCATTER_FREE_SPINS,
  TM_LINE_DEFS,
  MAX_WIN_MULTIPLIER,
  type TMSymbolId,
} from './timeMachineConfig.js';
import type { ReelMatrix, SpinOutcome, WinBreakdownItem } from './spinEngine.js';

function getSymbolId(symbolIndex: number): string {
  return TM_SYMBOLS[symbolIndex] ?? 'Gear';
}

/**
 * Build outcome matrix from RNG using the specified reel strips.
 */
function buildReelMatrix(rng: () => number, reelStrips: number[][]): ReelMatrix {
  const matrix: ReelMatrix = [];
  for (let r = 0; r < TM_REELS; r++) {
    const strip = reelStrips[r]!;
    const pos = Math.floor(rng() * strip.length);
    const col: string[] = [];
    for (let row = 0; row < TM_ROWS; row++) {
      const idx = (pos + row) % strip.length;
      col.push(getSymbolId(strip[idx]!));
    }
    matrix.push(col);
  }
  return matrix;
}

const WILD_INDEX = TM_SYMBOLS.indexOf('CronoWild');
const SCATTER_ID = 'VortexScatter';

/** Evaluate line: left-to-right, CronoWild substitutes all except VortexScatter. */
function evaluateLine(
  matrix: ReelMatrix,
  line: number[],
  wildIndex: number
): { symbolIndex: number; count: number } | null {
  let count = 0;
  let symbol: number | null = null;
  const scatterIndex = TM_SYMBOLS.indexOf('VortexScatter');

  for (let r = 0; r < TM_REELS; r++) {
    const row = line[r]!;
    const symStr = matrix[r]?.[row];
    if (!symStr) break;
    const symIdx = TM_SYMBOLS.indexOf(symStr as TMSymbolId);

    if (symIdx === scatterIndex) break; // scatter breaks line evaluation
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

/** Count VortexScatter symbols in matrix (any position). */
function countScatters(matrix: ReelMatrix): number {
  let n = 0;
  for (let r = 0; r < TM_REELS; r++) {
    for (let row = 0; row < TM_ROWS; row++) {
      if (matrix[r]?.[row] === SCATTER_ID) n++;
    }
  }
  return n;
}

/** Get free spins count for scatter count. */
function getFreeSpinsForScatters(count: number): number {
  for (let i = TM_SCATTER_FREE_SPINS.length - 1; i >= 0; i--) {
    if (count >= TM_SCATTER_FREE_SPINS[i]![0]) return TM_SCATTER_FREE_SPINS[i]![1]!;
  }
  return 0;
}

/**
 * Build a cosmetic idle matrix using Math.random() (not seeded RNG).
 */
export function buildTimeMachineIdleMatrix(): ReelMatrix {
  const matrix: ReelMatrix = [];
  for (let r = 0; r < TM_REELS; r++) {
    const strip = TM_REEL_STRIPS[r]!;
    const pos = Math.floor(Math.random() * strip.length);
    const col: string[] = [];
    for (let row = 0; row < TM_ROWS; row++) {
      const idx = (pos + row) % strip.length;
      col.push(getSymbolId(strip[idx]!));
    }
    matrix.push(col);
  }
  return matrix;
}

/**
 * Core spin logic shared between base game and rewind spins.
 */
function executeSingleSpin(
  betAmount: number,
  currency: string,
  activeLines: number,
  reelStrips: number[][],
  seed: number
): { outcome: SpinOutcome; seedUsed: number } {
  const rng = createSeededRNG(seed);
  const normalizedLines = Math.max(1, Math.min(TM_PAYLINES, Math.floor(activeLines)));

  const reel_matrix = buildReelMatrix(rng, reelStrips);

  const breakdown: WinBreakdownItem[] = [];
  let totalWin = 0;
  const betPerLine = betAmount / normalizedLines;

  for (let lineIndex = 0; lineIndex < Math.min(normalizedLines, TM_LINE_DEFS.length); lineIndex++) {
    const line = TM_LINE_DEFS[lineIndex]!;
    const result = evaluateLine(reel_matrix, line, WILD_INDEX);
    if (!result) continue;
    const pay = TM_PAYTABLE[result.symbolIndex];
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

  // Apply win cap (5000x bet)
  const maxWin = betAmount * MAX_WIN_MULTIPLIER;
  if (totalWin > maxWin) {
    totalWin = maxWin;
  }

  const scatterCount = countScatters(reel_matrix);
  const freeSpinsCount = getFreeSpinsForScatters(scatterCount);
  const bonus_triggered =
    freeSpinsCount > 0
      ? {
          type: 'free_spins' as const,
          free_spins_count: freeSpinsCount,
          bonus_round_id: `br_tm_${seed}`,
          multiplier: 1,
        }
      : null;

  return {
    outcome: {
      reel_matrix,
      win: { amount: Math.round(totalWin * 100) / 100, currency, breakdown },
      bonus_triggered,
    },
    seedUsed: seed,
  };
}

/**
 * Run a standard Time Machine spin (base game, uses standard reel strips).
 */
export function runTimeMachineSpin(
  betAmount: number,
  currency: string,
  activeLines: number = TM_PAYLINES,
  seed?: number
): { outcome: SpinOutcome; seedUsed: number } {
  const seedUsed = seed ?? getRandomSeed();
  return executeSingleSpin(betAmount, currency, activeLines, TM_REEL_STRIPS, seedUsed);
}

/**
 * Run a rewind spin using boosted reel strips for the specified tier.
 */
export function runTimeMachineRewindSpin(
  betAmount: number,
  currency: string,
  activeLines: number,
  tier: 'safe' | 'standard' | 'super',
  seed: number
): { outcome: SpinOutcome; seedUsed: number } {
  const boostedStrips = TM_BOOSTED_STRIPS[tier];
  return executeSingleSpin(betAmount, currency, activeLines, boostedStrips, seed);
}
