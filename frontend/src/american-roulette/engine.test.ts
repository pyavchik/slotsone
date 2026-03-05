import { describe, expect, it } from 'vitest';
import { evaluateBets, totalBetAmount, type BetState } from './engine';

describe('american roulette payout evaluation', () => {
  it('calculates straight payout 35:1', () => {
    const bets: BetState = { 'straight-17': 10 };
    const result = evaluateBets(bets, 17);
    expect(result.totalBet).toBe(10);
    expect(result.totalReturn).toBe(360);
    expect(result.net).toBe(350);
  });

  it('calculates red/black payout 1:1', () => {
    expect(evaluateBets({ red: 20 }, 3).totalReturn).toBe(40);
    expect(evaluateBets({ black: 20 }, 3).totalReturn).toBe(0);
  });

  it('calculates even/odd payout 1:1', () => {
    expect(evaluateBets({ even: 10 }, 22).totalReturn).toBe(20);
    expect(evaluateBets({ odd: 10 }, 22).totalReturn).toBe(0);
  });

  it('calculates low/high payout 1:1', () => {
    expect(evaluateBets({ low: 15 }, 7).totalReturn).toBe(30);
    expect(evaluateBets({ high: 15 }, 7).totalReturn).toBe(0);
  });

  it('calculates dozens payout 2:1', () => {
    expect(evaluateBets({ dozen1: 25 }, 12).totalReturn).toBe(75);
    expect(evaluateBets({ dozen2: 25 }, 12).totalReturn).toBe(0);
    expect(evaluateBets({ dozen3: 25 }, 12).totalReturn).toBe(0);
  });

  it('calculates columns payout 2:1', () => {
    expect(evaluateBets({ column1: 10 }, 34).totalReturn).toBe(30);
    expect(evaluateBets({ column2: 10 }, 34).totalReturn).toBe(0);
    expect(evaluateBets({ column3: 10 }, 34).totalReturn).toBe(0);
  });

  it('treats 0 and 00 as no-win for even/odd low/high dozens/columns', () => {
    const outside: BetState = {
      even: 5,
      odd: 5,
      low: 5,
      high: 5,
      dozen1: 5,
      dozen2: 5,
      dozen3: 5,
      column1: 5,
      column2: 5,
      column3: 5,
    };

    expect(evaluateBets(outside, 0).totalReturn).toBe(0);
    expect(evaluateBets(outside, '00').totalReturn).toBe(0);
  });

  it('supports distinct straight bets for 0 and 00', () => {
    expect(evaluateBets({ 'straight-0': 4 }, 0).totalReturn).toBe(144);
    expect(evaluateBets({ 'straight-00': 4 }, '00').totalReturn).toBe(144);
    expect(evaluateBets({ 'straight-0': 4 }, '00').totalReturn).toBe(0);
  });

  it('sums total bet amount', () => {
    expect(totalBetAmount({ red: 10, 'straight-00': 5, low: 1 })).toBe(16);
  });
});
