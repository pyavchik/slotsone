import type { RouletteBetType } from './rouletteConfig.js';
import {
  BET_TYPES,
  NUMBER_COLORS,
  EVEN_MONEY_TYPES,
  areTableAdjacent,
  TABLE_ROWS,
  ROULETTE_CONFIG,
} from './rouletteConfig.js';

export interface RouletteBet {
  type: RouletteBetType;
  numbers: number[];
  amount: number;
}

const COLUMN_SETS = [
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
];

const DOZENS = [
  Array.from({ length: 12 }, (_, i) => i + 1),
  Array.from({ length: 12 }, (_, i) => i + 13),
  Array.from({ length: 12 }, (_, i) => i + 25),
];

const RED_SET = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);
const BLACK_SET = new Set<number>([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
]);

function areAllValidNumbers(numbers: number[]): boolean {
  return numbers.length > 0 && numbers.every((n) => Number.isInteger(n) && n >= 0 && n <= 36);
}

function hasDuplicates(numbers: number[]): boolean {
  return new Set(numbers).size !== numbers.length;
}

function tablePos(n: number): { row: number; col: number } | null {
  for (let r = 0; r < TABLE_ROWS.length; r++) {
    const c = TABLE_ROWS[r]!.indexOf(n);
    if (c !== -1) return { row: r, col: c };
  }
  return null;
}

function isStreet(numbers: number[]): boolean {
  if (numbers.length !== 3) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  // All 3 must be in the same column of TABLE_ROWS (same col = same group of 3)
  const positions = sorted.map(tablePos);
  if (positions.some((p) => p === null)) return false;
  const ps = positions as { row: number; col: number }[];
  return ps[0]!.col === ps[1]!.col && ps[1]!.col === ps[2]!.col;
}

function isTrio(numbers: number[]): boolean {
  if (numbers.length !== 3) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  return (
    (sorted[0] === 0 && sorted[1] === 1 && sorted[2] === 2) ||
    (sorted[0] === 0 && sorted[1] === 2 && sorted[2] === 3)
  );
}

function isBasket(numbers: number[]): boolean {
  if (numbers.length !== 4) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted[0] === 0 && sorted[1] === 1 && sorted[2] === 2 && sorted[3] === 3;
}

function isCorner(numbers: number[]): boolean {
  if (numbers.length !== 4) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  const positions = sorted.map(tablePos);
  if (positions.some((p) => p === null)) return false;
  const ps = positions as { row: number; col: number }[];
  const rows = new Set(ps.map((p) => p.row));
  const cols = new Set(ps.map((p) => p.col));
  if (rows.size !== 2 || cols.size !== 2) return false;
  const [minRow, maxRow] = [...rows].sort((a, b) => a - b);
  const [minCol, maxCol] = [...cols].sort((a, b) => a - b);
  return maxRow! - minRow! === 1 && maxCol! - minCol! === 1;
}

function isSixLine(numbers: number[]): boolean {
  if (numbers.length !== 6) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  const positions = sorted.map(tablePos);
  if (positions.some((p) => p === null)) return false;
  const ps = positions as { row: number; col: number }[];
  const rows = new Set(ps.map((p) => p.row));
  const cols = new Set(ps.map((p) => p.col));
  if (rows.size !== 3 || cols.size !== 2) return false;
  const [minCol, maxCol] = [...cols].sort((a, b) => a - b);
  return maxCol! - minCol! === 1;
}

function isColumn(numbers: number[]): boolean {
  return COLUMN_SETS.some(
    (col) => numbers.length === col.length && numbers.every((n) => col.includes(n))
  );
}

function isDozen(numbers: number[]): boolean {
  return DOZENS.some((dz) => numbers.length === dz.length && numbers.every((n) => dz.includes(n)));
}

function isEvenMoney(type: RouletteBetType, numbers: number[]): boolean {
  if (numbers.length !== 18) return false;
  switch (type) {
    case 'red':
      return numbers.every((n) => RED_SET.has(n));
    case 'black':
      return numbers.every((n) => BLACK_SET.has(n));
    case 'even':
      return numbers.every((n) => n >= 1 && n <= 36 && n % 2 === 0);
    case 'odd':
      return numbers.every((n) => n >= 1 && n <= 36 && n % 2 === 1);
    case 'high':
      return numbers.every((n) => n >= 19 && n <= 36);
    case 'low':
      return numbers.every((n) => n >= 1 && n <= 18);
    default:
      return false;
  }
}

function betKey(type: string, numbers: number[]): string {
  return `${type}:${[...numbers].sort((a, b) => a - b).join(',')}`;
}

export function validateRouletteBets(
  bets: RouletteBet[]
): { valid: true } | { valid: false; error: string } {
  if (!Array.isArray(bets) || bets.length === 0) {
    return { valid: false, error: 'At least one bet required' };
  }

  const seenKeys = new Set<string>();
  let totalBet = 0;

  for (const bet of bets) {
    if (!BET_TYPES[bet.type]) {
      return { valid: false, error: `Invalid bet type: ${bet.type}` };
    }

    if (!Array.isArray(bet.numbers) || bet.numbers.length !== BET_TYPES[bet.type].size) {
      return {
        valid: false,
        error: `Invalid numbers count for ${bet.type}: expected ${BET_TYPES[bet.type].size}, got ${bet.numbers.length}`,
      };
    }

    if (!areAllValidNumbers(bet.numbers)) {
      return { valid: false, error: 'Numbers must be integers between 0 and 36' };
    }

    if (hasDuplicates(bet.numbers)) {
      return { valid: false, error: 'Duplicate numbers in bet' };
    }

    // Per-bet minimum
    if (bet.amount < ROULETTE_CONFIG.min_bet) {
      return {
        valid: false,
        error: `Bet amount ${bet.amount} below minimum ${ROULETTE_CONFIG.min_bet}`,
      };
    }

    // Per-type maximum
    if (bet.amount > BET_TYPES[bet.type].maxBet) {
      return {
        valid: false,
        error: `${bet.type} bet amount ${bet.amount} exceeds max ${BET_TYPES[bet.type].maxBet}`,
      };
    }

    // Duplicate bet detection
    const key = betKey(bet.type, bet.numbers);
    if (seenKeys.has(key)) {
      return { valid: false, error: `Duplicate bet: ${bet.type} on [${bet.numbers.join(',')}]` };
    }
    seenKeys.add(key);

    // Structural validation per bet type
    switch (bet.type) {
      case 'straight':
        break;
      case 'split':
        if (!areTableAdjacent(bet.numbers[0]!, bet.numbers[1]!)) {
          return { valid: false, error: 'Split numbers must be adjacent on the table' };
        }
        break;
      case 'street':
        if (!isStreet(bet.numbers)) {
          return { valid: false, error: 'Street must be a 3-number column group (e.g. 1,2,3)' };
        }
        break;
      case 'trio':
        if (!isTrio(bet.numbers)) {
          return { valid: false, error: 'Trio must be [0,1,2] or [0,2,3]' };
        }
        break;
      case 'corner':
        if (!isCorner(bet.numbers)) {
          return { valid: false, error: 'Corner must form a 2x2 block on the table' };
        }
        break;
      case 'basket':
        if (!isBasket(bet.numbers)) {
          return { valid: false, error: 'Basket must be [0,1,2,3]' };
        }
        break;
      case 'sixLine':
        if (!isSixLine(bet.numbers)) {
          return { valid: false, error: 'Six line must be two adjacent column groups (6 numbers)' };
        }
        break;
      case 'column':
        if (!isColumn(bet.numbers)) {
          return { valid: false, error: 'Column bet must match a full column' };
        }
        break;
      case 'dozen':
        if (!isDozen(bet.numbers)) {
          return { valid: false, error: 'Dozen bet must match a dozen range' };
        }
        break;
      default:
        if (EVEN_MONEY_TYPES.includes(bet.type)) {
          if (!isEvenMoney(bet.type, bet.numbers)) {
            return { valid: false, error: `${bet.type} bet numbers invalid` };
          }
        }
        break;
    }

    // Color validation for red/black
    if (bet.type === 'red') {
      for (const n of bet.numbers) {
        if (NUMBER_COLORS[n] !== 'red')
          return { valid: false, error: 'Red bet must contain only red numbers' };
      }
    }
    if (bet.type === 'black') {
      for (const n of bet.numbers) {
        if (NUMBER_COLORS[n] !== 'black')
          return { valid: false, error: 'Black bet must contain only black numbers' };
      }
    }

    totalBet += bet.amount;
  }

  // Total table limit
  if (totalBet > ROULETTE_CONFIG.max_total_bet) {
    return {
      valid: false,
      error: `Total bet ${totalBet} exceeds table limit ${ROULETTE_CONFIG.max_total_bet}`,
    };
  }

  return { valid: true };
}
