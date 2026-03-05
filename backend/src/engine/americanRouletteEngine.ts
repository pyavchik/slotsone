import { createSeededRNG } from './rng.js';
import type { AmericanRouletteBetType } from './americanRouletteConfig.js';
import {
  BET_TYPES,
  NUMBER_COLORS,
  AMERICAN_ROULETTE_CONFIG,
  AMERICAN_WHEEL_ORDER,
  DOUBLE_ZERO,
} from './americanRouletteConfig.js';
import type { AmericanRouletteBet } from './americanRouletteValidation.js';
import { validateAmericanRouletteBets } from './americanRouletteValidation.js';

export interface AmericanBetResult {
  bet_type: AmericanRouletteBetType;
  numbers: number[];
  bet_amount: number;
  payout: number;
  profit: number;
  won: boolean;
}

export interface AmericanRouletteOutcome {
  winning_number: number; // -1 for 00, 0 for 0, 1-36
  winning_number_display: string; // "00", "0", "1"-"36"
  winning_color: 'red' | 'black' | 'green';
  wheel_position: number;
  win: {
    amount: number;
    currency: string;
    breakdown: AmericanBetResult[];
  };
  total_bet: number;
  total_return: number;
}

export function runAmericanRouletteSpin(
  bets: AmericanRouletteBet[],
  currency: string,
  seed: number
): AmericanRouletteOutcome {
  const validation = validateAmericanRouletteBets(bets);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const rng = createSeededRNG(seed);
  const wheel_position = Math.floor(rng() * 38); // 38 pockets
  const winning_number = AMERICAN_WHEEL_ORDER[wheel_position]!;
  const winning_color = NUMBER_COLORS[winning_number] ?? 'green';
  const winning_number_display = winning_number === DOUBLE_ZERO ? '00' : String(winning_number);

  const breakdown: AmericanBetResult[] = [];
  let totalWin = 0;
  let totalBet = 0;

  for (const bet of bets) {
    const { payout: multiplier } = BET_TYPES[bet.type];
    const isWin = bet.numbers.includes(winning_number);
    // No la partage in American roulette — 0 and 00 both lose for outside bets
    const payout = isWin ? bet.amount * (multiplier + 1) : 0;
    const profit = payout - bet.amount;

    totalWin += payout;
    totalBet += bet.amount;

    breakdown.push({
      bet_type: bet.type,
      numbers: bet.numbers,
      bet_amount: bet.amount,
      payout: Math.round(payout * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      won: isWin,
    });
  }

  return {
    winning_number,
    winning_number_display,
    winning_color,
    wheel_position,
    win: {
      amount: Math.round(totalWin * 100) / 100,
      currency,
      breakdown,
    },
    total_bet: Math.round(totalBet * 100) / 100,
    total_return: Math.round(totalWin * 100) / 100,
  };
}

export type { AmericanRouletteBet };
export const AMERICAN_ROULETTE_MIN_BET = AMERICAN_ROULETTE_CONFIG.min_bet;
export const AMERICAN_ROULETTE_MAX_TOTAL_BET = AMERICAN_ROULETTE_CONFIG.max_total_bet;
