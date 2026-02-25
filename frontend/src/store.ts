import { create } from 'zustand';
import type { InitResponse, SpinResponse } from './api';

const DEFAULT_DEV_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXItMSIsImlzcyI6InNsb3Rzb25lLWRldiIsImF1ZCI6InNsb3Rzb25lLWNsaWVudCIsImV4cCI6NDEwMjQ0NDgwMH0.Jr811gvpQFBBgZ329xoSvd6lC-drBLxcrXRs-yGX9N0';

interface GameState {
  token: string;
  sessionId: string | null;
  gameId: string;
  balance: number;
  currency: string;
  bet: number;
  betLevels: number[];
  minBet: number;
  maxBet: number;
  spinning: boolean;
  lastOutcome: SpinResponse['outcome'] | null;
  lastWinAmount: number;
  config: InitResponse['config'] | null;
  error: string | null;
  // Actions
  setToken: (t: string) => void;
  setInit: (data: InitResponse) => void;
  setBet: (amount: number) => void;
  setSpinning: (v: boolean) => void;
  setSpinResult: (data: SpinResponse) => void;
  setError: (e: string | null) => void;
  resetOutcome: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  token: import.meta.env.VITE_DEMO_JWT ?? DEFAULT_DEV_TOKEN,
  sessionId: null,
  gameId: 'slot_mega_fortune_001',
  balance: 0,
  currency: 'USD',
  bet: 1,
  betLevels: [0.1, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 100],
  minBet: 0.1,
  maxBet: 100,
  spinning: false,
  lastOutcome: null,
  lastWinAmount: 0,
  config: null,
  error: null,

  setToken: (t) => set({ token: t }),
  setInit: (data) =>
    set({
      sessionId: data.session_id,
      gameId: data.game_id,
      balance: data.balance.amount,
      currency: data.balance.currency,
      betLevels: data.config.bet_levels,
      minBet: data.config.min_bet,
      maxBet: data.config.max_bet,
      config: data.config,
      bet: Math.max(data.config.min_bet, Math.min(data.config.max_bet, 1)),
    }),
  setBet: (amount) => set((s) => ({ bet: Math.max(s.minBet, Math.min(s.maxBet, amount)) })),
  setSpinning: (v) => set({ spinning: v }),
  setSpinResult: (data) =>
    set({
      balance: data.balance.amount,
      lastOutcome: data.outcome,
      lastWinAmount: data.outcome.win.amount,
      error: null,
      // spinning stays true until ReelGrid onAllStopped
    }),
  setError: (e) => set({ error: e, spinning: false }),
  resetOutcome: () => set({ lastOutcome: null, lastWinAmount: 0 }),
}));
