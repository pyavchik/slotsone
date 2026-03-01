import { create } from 'zustand';
import type { InitResponse, SpinResponse } from './api';

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
  pendingWinAmount: number | null;
  config: InitResponse['config'] | null;
  idleMatrix: string[][] | null;
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
  // Access token lives in JS memory only — never localStorage.
  // The refresh token is stored in an httpOnly cookie by the server.
  token: '',
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
  pendingWinAmount: null,
  config: null,
  idleMatrix: null,
  error: null,

  setToken: (t) => set({ token: t }),
  setInit: (data) => {
    const maxLines = Math.max(1, data.config.max_lines ?? data.config.paylines);
    const minLines = Math.max(1, Math.min(maxLines, data.config.min_lines ?? 1));
    const defaultLines = Math.max(
      minLines,
      Math.min(maxLines, Math.round(data.config.default_lines ?? maxLines))
    );
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
      idleMatrix: data.idle_matrix,
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
      lastWinAmount: v ? 0 : (s.pendingWinAmount ?? 0),
      pendingWinAmount: null,
    })),
  setSpinResult: (data) =>
    set({
      balance: data.balance.amount,
      lastOutcome: data.outcome,
      pendingWinAmount: data.outcome.win.amount,
      error: null,
      // spinning stays true until ReelGrid onAllStopped
    }),
  setError: (e) => set({ error: e, spinning: false, pendingWinAmount: null, lastWinAmount: 0 }),
  resetOutcome: () => set({ lastOutcome: null, lastWinAmount: 0, pendingWinAmount: null }),
}));
