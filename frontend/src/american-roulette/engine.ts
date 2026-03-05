import { BET_SPOT_MAP } from './constants';
import type { BetResult, EvaluationResult, RouletteOutcome } from './types';

export type BetState = Record<string, number>;

export function totalBetAmount(bets: BetState): number {
  return Object.values(bets).reduce((sum, amount) => sum + amount, 0);
}

export function evaluateBets(bets: BetState, outcome: RouletteOutcome): EvaluationResult {
  const winningBets: BetResult[] = [];
  let totalReturn = 0;

  for (const [id, amount] of Object.entries(bets)) {
    if (amount <= 0) {
      continue;
    }

    const spot = BET_SPOT_MAP.get(id);
    if (!spot) {
      continue;
    }

    const won = spot.outcomes.includes(outcome);
    const payout = won ? amount * (spot.payout + 1) : 0;
    if (won) {
      winningBets.push({
        id,
        type: spot.type,
        amount,
        won,
        payout,
      });
      totalReturn += payout;
    }
  }

  const totalBet = totalBetAmount(bets);

  return {
    totalBet,
    totalReturn,
    net: totalReturn - totalBet,
    winningBets,
  };
}

export function canAffordBet(balance: number, currentBets: BetState, chipValue: number): boolean {
  return totalBetAmount(currentBets) + chipValue <= balance;
}

export function copyBets(bets: BetState): BetState {
  return { ...bets };
}
