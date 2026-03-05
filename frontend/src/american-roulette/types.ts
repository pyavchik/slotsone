export type RouletteOutcome = number | '00';

export type BetType =
  | 'straight'
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high'
  | 'dozen1'
  | 'dozen2'
  | 'dozen3'
  | 'column1'
  | 'column2'
  | 'column3';

export interface BetSpot {
  id: string;
  type: BetType;
  label: string;
  outcomes: RouletteOutcome[];
  payout: number;
}

export interface BetResult {
  id: string;
  type: BetType;
  amount: number;
  won: boolean;
  payout: number;
}

export interface EvaluationResult {
  totalBet: number;
  totalReturn: number;
  net: number;
  winningBets: BetResult[];
}
