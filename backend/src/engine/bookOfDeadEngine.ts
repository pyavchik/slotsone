import { createSeededRNG, getRandomSeed } from './rng.js';
import {
  BOD_REELS,
  BOD_ROWS,
  BOD_PAYLINES,
  BOD_SYMBOLS,
  BOD_REEL_STRIPS,
  BOD_PAYTABLE,
  BOD_SCATTER_FREE_SPINS,
  BOD_LINE_DEFS,
  type BodSymbolId,
} from './bookOfDeadConfig.js';
import type { ReelMatrix, SpinOutcome, WinBreakdownItem } from './spinEngine.js';

const BOOK_INDEX = BOD_SYMBOLS.indexOf('Book');

function getSymbolId(symbolIndex: number): string {
  return BOD_SYMBOLS[symbolIndex] ?? '10';
}

/**
 * Build outcome matrix from RNG. Each reel stops at a random position in its strip.
 */
function buildReelMatrix(rng: () => number): ReelMatrix {
  const matrix: ReelMatrix = [];
  for (let r = 0; r < BOD_REELS; r++) {
    const strip = BOD_REEL_STRIPS[r]!;
    const pos = Math.floor(rng() * strip.length);
    const col: string[] = [];
    for (let row = 0; row < BOD_ROWS; row++) {
      const idx = (pos + row) % strip.length;
      col.push(getSymbolId(strip[idx]!));
    }
    matrix.push(col);
  }
  return matrix;
}

/**
 * Evaluate a payline left-to-right. Book acts as Wild (substitutes for all).
 * RichWilde pays for 2+, others pay for 3+.
 * Returns the best-paying symbol and count, or null if no win.
 */
function evaluateLine(
  matrix: ReelMatrix,
  line: number[]
): { symbolIndex: number; count: number } | null {
  let count = 0;
  let symbol: number | null = null;
  for (let r = 0; r < BOD_REELS; r++) {
    const row = line[r]!;
    const symStr = matrix[r]?.[row];
    if (!symStr) break;
    const symIdx = BOD_SYMBOLS.indexOf(symStr as BodSymbolId);
    // Book is wild — substitutes for everything
    if (symIdx === BOOK_INDEX) {
      count++;
      continue;
    }
    if (symbol === null) symbol = symIdx;
    if (symIdx !== symbol) break;
    count++;
  }
  // RichWilde (index 0) pays from 2+, all others from 3+
  const minCount = symbol === 0 ? 2 : 3;
  if (count < minCount || symbol === null) return null;
  return { symbolIndex: symbol, count };
}

/** Count Book (scatter) symbols anywhere in the matrix. */
function countBooks(matrix: ReelMatrix): number {
  let n = 0;
  for (let r = 0; r < BOD_REELS; r++) {
    for (let row = 0; row < BOD_ROWS; row++) {
      if (matrix[r]?.[row] === 'Book') n++;
    }
  }
  return n;
}

/** Get free spins count for scatter count. */
function getFreeSpinsForBooks(count: number): number {
  for (let i = BOD_SCATTER_FREE_SPINS.length - 1; i >= 0; i--) {
    if (count >= BOD_SCATTER_FREE_SPINS[i]![0]) return BOD_SCATTER_FREE_SPINS[i]![1]!;
  }
  return 0;
}

/**
 * Evaluate all active lines and return win breakdown + total win.
 */
function evaluateAllLines(
  matrix: ReelMatrix,
  betPerLine: number,
  activeLines: number
): { breakdown: WinBreakdownItem[]; totalWin: number } {
  const breakdown: WinBreakdownItem[] = [];
  let totalWin = 0;

  for (let lineIndex = 0; lineIndex < Math.min(activeLines, BOD_LINE_DEFS.length); lineIndex++) {
    const line = BOD_LINE_DEFS[lineIndex]!;
    const result = evaluateLine(matrix, line);
    if (!result) continue;
    const pay = BOD_PAYTABLE[result.symbolIndex];
    if (!pay) continue;
    // pay array: [2-of-a-kind, 3, 4, 5] → index = count - 2
    const mult = pay[result.count - 2];
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

  return { breakdown, totalWin };
}

/**
 * Expand a symbol on reels where it appears and contributes to a win.
 * Returns a new matrix with the expanding symbol filling entire reels where applicable.
 */
function applyExpandingSymbol(
  matrix: ReelMatrix,
  expandingSymbolIdx: number,
  activeLines: number
): ReelMatrix {
  const expandingSym = getSymbolId(expandingSymbolIdx);

  // Find which reels contain the expanding symbol
  const reelsWithSymbol: boolean[] = [];
  for (let r = 0; r < BOD_REELS; r++) {
    let found = false;
    for (let row = 0; row < BOD_ROWS; row++) {
      if (matrix[r]?.[row] === expandingSym) {
        found = true;
        break;
      }
    }
    reelsWithSymbol.push(found);
  }

  // Check if expanding the symbol on those reels would produce any line wins
  // Create a test matrix with the symbol expanded on all qualifying reels
  const testMatrix: ReelMatrix = matrix.map((col, r) => {
    if (reelsWithSymbol[r]) {
      return Array(BOD_ROWS).fill(expandingSym) as string[];
    }
    return [...col];
  });

  // Check if the expanded matrix has any wins involving the expanding symbol
  const { breakdown } = evaluateAllLines(testMatrix, 1, activeLines);
  const hasWinWithExpand = breakdown.some((item) => item.symbol === expandingSym);

  if (hasWinWithExpand) {
    return testMatrix;
  }

  // No wins with expansion — return original matrix unchanged
  return matrix;
}

/**
 * Choose a random expanding symbol (from the non-Book symbols) for free spins.
 */
function chooseExpandingSymbol(rng: () => number): number {
  // Pick from all symbols except Book (index 9)
  const candidates = BOD_SYMBOLS.map((_s, i) => i).filter((i) => i !== BOOK_INDEX);
  const idx = Math.floor(rng() * candidates.length);
  return candidates[idx]!;
}

/**
 * Build a cosmetic idle matrix using Math.random() (not seeded RNG).
 */
export function buildBookOfDeadIdleMatrix(): ReelMatrix {
  const matrix: ReelMatrix = [];
  for (let r = 0; r < BOD_REELS; r++) {
    const strip = BOD_REEL_STRIPS[r]!;
    const pos = Math.floor(Math.random() * strip.length);
    const col: string[] = [];
    for (let row = 0; row < BOD_ROWS; row++) {
      const idx = (pos + row) % strip.length;
      col.push(getSymbolId(strip[idx]!));
    }
    matrix.push(col);
  }
  return matrix;
}

/**
 * Run a base game spin for Book of Dead.
 */
export function runBookOfDeadSpin(
  betAmount: number,
  currency: string,
  activeLines: number = BOD_PAYLINES,
  seed?: number
): { outcome: SpinOutcome; seedUsed: number } {
  const seedUsed = seed ?? getRandomSeed();
  const rng = createSeededRNG(seedUsed);
  const normalizedLines = Math.max(1, Math.min(BOD_PAYLINES, Math.floor(activeLines)));

  const reel_matrix = buildReelMatrix(rng);
  const betPerLine = betAmount / normalizedLines;

  const { breakdown, totalWin } = evaluateAllLines(reel_matrix, betPerLine, normalizedLines);

  const bookCount = countBooks(reel_matrix);
  const freeSpinsCount = getFreeSpinsForBooks(bookCount);

  let bonus_triggered: SpinOutcome['bonus_triggered'] = null;
  if (freeSpinsCount > 0) {
    const expandingSymbolIdx = chooseExpandingSymbol(rng);
    bonus_triggered = {
      type: 'free_spins' as const,
      free_spins_count: freeSpinsCount,
      bonus_round_id: `br_${seedUsed}`,
      multiplier: 1,
      expanding_symbol: getSymbolId(expandingSymbolIdx),
    };
  }

  return {
    outcome: {
      reel_matrix,
      win: { amount: Math.round(totalWin * 100) / 100, currency, breakdown },
      bonus_triggered,
    },
    seedUsed,
  };
}

/**
 * Run a free spin for Book of Dead with expanding symbol mechanic.
 * The expanding symbol was chosen when the bonus was triggered.
 */
export function runBookOfDeadFreeSpin(
  betAmount: number,
  currency: string,
  activeLines: number,
  expandingSymbolName: string,
  seed?: number
): { outcome: SpinOutcome; seedUsed: number } {
  const seedUsed = seed ?? getRandomSeed();
  const rng = createSeededRNG(seedUsed);
  const normalizedLines = Math.max(1, Math.min(BOD_PAYLINES, Math.floor(activeLines)));

  let reel_matrix = buildReelMatrix(rng);
  const betPerLine = betAmount / normalizedLines;

  // Apply expanding symbol mechanic
  const expandingSymbolIdx = BOD_SYMBOLS.indexOf(expandingSymbolName as BodSymbolId);
  if (expandingSymbolIdx >= 0) {
    reel_matrix = applyExpandingSymbol(reel_matrix, expandingSymbolIdx, normalizedLines);
  }

  const { breakdown, totalWin } = evaluateAllLines(reel_matrix, betPerLine, normalizedLines);

  // Check for retrigger (3+ Books)
  const bookCount = countBooks(reel_matrix);
  const retriggeredSpins = getFreeSpinsForBooks(bookCount);

  let bonus_triggered: SpinOutcome['bonus_triggered'] = null;
  if (retriggeredSpins > 0) {
    bonus_triggered = {
      type: 'free_spins' as const,
      free_spins_count: retriggeredSpins,
      bonus_round_id: `br_${seedUsed}`,
      multiplier: 1,
      expanding_symbol: expandingSymbolName,
    };
  }

  return {
    outcome: {
      reel_matrix,
      win: { amount: Math.round(totalWin * 100) / 100, currency, breakdown },
      bonus_triggered,
    },
    seedUsed,
  };
}
