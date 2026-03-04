import { create } from 'zustand';
import type {
  RouletteBet,
  RouletteConfig,
  RouletteInitResponse,
  RouletteSpinResponse,
  RouletteOutcome,
} from '../api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function betKey(type: string, numbers: number[]): string {
  return `${type}:${[...numbers].sort((a, b) => a - b).join(',')}`;
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

interface RouletteState {
  sessionId: string | null;
  gameId: string;
  balance: number;
  currency: string;
  config: RouletteConfig | null;
  bets: RouletteBet[];
  betHistory: RouletteBet[][];
  previousBets: RouletteBet[];
  selectedChipValue: number;
  phase: 'idle' | 'betting' | 'spinning' | 'ball_drop' | 'result' | 'payout';
  lastResult: RouletteOutcome | null;
  recentNumbers: number[];
  error: string | null;
  sessionStartTime: number;
  sessionTotals: { wagered: number; won: number; rounds: number };

  // Actions
  setInit: (data: RouletteInitResponse) => void;
  placeBet: (bet: RouletteBet) => void;
  removeBet: (type: string, numbers: number[]) => void;
  undoLastBet: () => void;
  clearBets: () => void;
  doubleBets: () => void;
  rebet: () => void;
  setChipValue: (value: number) => void;
  setSpinResult: (data: RouletteSpinResponse) => void;
  setPhase: (phase: 'idle' | 'betting' | 'spinning' | 'ball_drop' | 'result' | 'payout') => void;
  setError: (e: string | null) => void;
  resetForNewRound: () => void;
  totalBet: () => number;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRouletteStore = create<RouletteState>((set, get) => ({
  sessionId: null,
  gameId: 'roulette_european_001',
  balance: 0,
  currency: 'USD',
  config: null,
  bets: [],
  betHistory: [],
  previousBets: [],
  selectedChipValue: 1,
  phase: 'idle',
  lastResult: null,
  recentNumbers: [],
  error: null,
  sessionStartTime: 0,
  sessionTotals: { wagered: 0, won: 0, rounds: 0 },

  setInit: (data) =>
    set({
      sessionId: data.session_id,
      gameId: data.game_id,
      config: data.config,
      balance: data.balance.amount,
      currency: data.balance.currency,
      recentNumbers: data.recent_numbers,
      phase: 'betting',
      sessionStartTime: Date.now(),
    }),

  placeBet: (bet) =>
    set((s) => {
      if (s.phase !== 'betting') return s;
      const key = betKey(bet.type, bet.numbers);
      const snapshot = [...s.bets];
      const existing = s.bets.find((b) => betKey(b.type, b.numbers) === key);

      let nextBets: RouletteBet[];
      if (existing) {
        nextBets = s.bets.map((b) =>
          betKey(b.type, b.numbers) === key ? { ...b, amount: b.amount + bet.amount } : b
        );
      } else {
        nextBets = [...s.bets, bet];
      }

      // Validate against config limits
      if (s.config) {
        const totalBet = nextBets.reduce((sum, b) => sum + b.amount, 0);
        if (totalBet > s.config.max_total_bet) return s;

        const betTypeConfig = s.config.bet_types[bet.type];
        if (betTypeConfig) {
          const updatedBet = nextBets.find((b) => betKey(b.type, b.numbers) === key);
          if (updatedBet && updatedBet.amount > betTypeConfig.maxBet) return s;
        }
      }

      return {
        betHistory: [...s.betHistory, snapshot],
        bets: nextBets,
      };
    }),

  removeBet: (type, numbers) =>
    set((s) => {
      const key = betKey(type, numbers);
      return {
        bets: s.bets.filter((b) => betKey(b.type, b.numbers) !== key),
      };
    }),

  undoLastBet: () =>
    set((s) => {
      if (s.betHistory.length === 0) return s;
      const history = [...s.betHistory];
      const previous = history.pop()!;
      return { bets: previous, betHistory: history };
    }),

  clearBets: () =>
    set((s) => ({
      betHistory: [...s.betHistory, [...s.bets]],
      bets: [],
    })),

  doubleBets: () =>
    set((s) => {
      if (s.bets.length === 0) return s;
      const doubled = s.bets.map((b) => ({ ...b, amount: b.amount * 2 }));

      // Validate against config limits
      if (s.config) {
        const totalBet = doubled.reduce((sum, b) => sum + b.amount, 0);
        if (totalBet > s.config.max_total_bet) return s;

        for (const b of doubled) {
          const betTypeConfig = s.config.bet_types[b.type];
          if (betTypeConfig && b.amount > betTypeConfig.maxBet) return s;
        }
      }

      return {
        betHistory: [...s.betHistory, [...s.bets]],
        bets: doubled,
      };
    }),

  rebet: () =>
    set((s) => {
      if (s.previousBets.length === 0) return s;
      return {
        betHistory: [...s.betHistory, [...s.bets]],
        bets: [...s.previousBets],
      };
    }),

  setChipValue: (value) => set({ selectedChipValue: value }),

  setSpinResult: (data) =>
    set((s) => {
      const winningNumber = data.outcome.winning_number;
      const updated = [winningNumber, ...s.recentNumbers].slice(0, 20);
      const totalBet = s.bets.reduce((sum, b) => sum + b.amount, 0);
      return {
        balance: data.balance.amount,
        lastResult: data.outcome,
        phase: 'result',
        recentNumbers: updated,
        previousBets: [...s.bets],
        bets: [],
        sessionTotals: {
          wagered: s.sessionTotals.wagered + totalBet,
          won: s.sessionTotals.won + data.outcome.win.amount,
          rounds: s.sessionTotals.rounds + 1,
        },
      };
    }),

  setPhase: (phase) => set({ phase }),

  setError: (e) =>
    set({
      error: e,
      ...(e ? { phase: 'betting' as const } : {}),
    }),

  resetForNewRound: () =>
    set({
      phase: 'betting',
      lastResult: null,
    }),

  totalBet: () => {
    const { bets } = get();
    return bets.reduce((sum, b) => sum + b.amount, 0);
  },
}));
