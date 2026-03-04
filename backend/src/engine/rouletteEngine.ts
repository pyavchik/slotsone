import { createSeededRNG } from './rng.js';
import type { RouletteBetType } from './rouletteConfig.js';
import {
  BET_TYPES,
  EVEN_MONEY_TYPES,
  NUMBER_COLORS,
  ROULETTE_CONFIG,
  WHEEL_ORDER,
} from './rouletteConfig.js';
import type { RouletteBet } from './rouletteValidation.js';
import { validateRouletteBets } from './rouletteValidation.js';

export interface BetResult {
  bet_type: RouletteBetType;
  numbers: number[];
  bet_amount: number;
  payout: number;
  profit: number;
  la_partage: boolean;
  won: boolean;
}

export interface RouletteOutcome {
  winning_number: number;
  winning_color: 'red' | 'black' | 'green';
  wheel_position: number;
  win: {
    amount: number;
    currency: string;
    breakdown: BetResult[];
  };
  total_bet: number;
  total_return: number;
}

export function runRouletteSpin(
  bets: RouletteBet[],
  currency: string,
  seed: number
): RouletteOutcome {
  const validation = validateRouletteBets(bets);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const rng = createSeededRNG(seed);
  const wheel_position = Math.floor(rng() * 37);
  const winning_number = WHEEL_ORDER[wheel_position]!;
  const winning_color = NUMBER_COLORS[winning_number] ?? 'green';

  const breakdown: BetResult[] = [];
  let totalWin = 0;
  let totalBet = 0;

  for (const bet of bets) {
    const { payout: multiplier } = BET_TYPES[bet.type];
    const isWin = bet.numbers.includes(winning_number);
    const isEvenMoney = EVEN_MONEY_TYPES.includes(bet.type);
    let payout = 0;
    let laPartage = false;

    if (isWin) {
      payout = bet.amount * (multiplier + 1);
    } else if (winning_number === 0 && isEvenMoney) {
      laPartage = true;
      payout = bet.amount / 2;
    }

    const profit = payout - bet.amount;
    totalWin += payout;
    totalBet += bet.amount;

    breakdown.push({
      bet_type: bet.type,
      numbers: bet.numbers,
      bet_amount: bet.amount,
      payout: Math.round(payout * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      la_partage: laPartage,
      won: isWin,
    });
  }

  return {
    winning_number,
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

export type { RouletteBet };
export const ROULETTE_MIN_BET = ROULETTE_CONFIG.min_bet;
export const ROULETTE_MAX_TOTAL_BET = ROULETTE_CONFIG.max_total_bet;
