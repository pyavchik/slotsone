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
  lines: number;
  betLevels: number[];
  minBet: number;
  maxBet: number;
  minLines: number;
  maxLines: number;
  spinning: boolean;
  lastOutcome: SpinResponse['outcome'] | null;
  lastWinAmount: number;
  config: InitResponse['config'] | null;
  error: string | null;
  // Actions
  setToken: (t: string) => void;
  setInit: (data: InitResponse) => void;
  setBet: (amount: number) => void;
  setLines: (lines: number) => void;
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
  lines: 20,
  betLevels: [0.1, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 100],
  minBet: 0.1,
  maxBet: 100,
  minLines: 1,
  maxLines: 20,
  spinning: false,
  lastOutcome: null,
  lastWinAmount: 0,
  config: null,
  error: null,

  setToken: (t) => set({ token: t }),
  setInit: (data) => {
    const maxLines = Math.max(1, data.config.max_lines ?? data.config.paylines);
    const minLines = Math.max(1, Math.min(maxLines, data.config.min_lines ?? 1));
    const defaultLines = Math.max(minLines, Math.min(maxLines, Math.round(data.config.default_lines ?? maxLines)));
    set({
      sessionId: data.session_id,
      gameId: data.game_id,
      balance: data.balance.amount,
      currency: data.balance.currency,
      betLevels: data.config.bet_levels,
      minBet: data.config.min_bet,
      maxBet: data.config.max_bet,
      minLines,
      maxLines,
      lines: defaultLines,
      config: data.config,
      bet: Math.max(data.config.min_bet, Math.min(data.config.max_bet, 1)),
    });
  },
  setBet: (amount) => set((s) => ({ bet: Math.max(s.minBet, Math.min(s.maxBet, amount)) })),
  setLines: (lines) =>
    set((s) => ({
      lines: Math.max(s.minLines, Math.min(s.maxLines, Math.round(lines))),
    })),
  setSpinning: (v) =>
    set((s) => ({
      spinning: v,
      lastWinAmount: v ? 0 : s.lastWinAmount,
    })),
  setSpinResult: (data) =>
    set({
      balance: data.balance.amount,
      lines: data.bet.lines,
      lastOutcome: data.outcome,
      lastWinAmount: data.outcome.win.amount,
      error: null,
      // spinning stays true until ReelGrid onAllStopped
    }),
  setError: (e) => set({ error: e, spinning: false }),
  resetOutcome: () => set({ lastOutcome: null, lastWinAmount: 0 }),
}));
