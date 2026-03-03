import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './store';
import type { InitResponse, SpinResponse } from './api';

function resetStore() {
  useGameStore.setState(useGameStore.getInitialState());
}

beforeEach(resetStore);

// ---------------------------------------------------------------------------
// Helpers — minimal valid payloads
// ---------------------------------------------------------------------------

function makeInitResponse(overrides?: Partial<InitResponse>): InitResponse {
  return {
    session_id: 'sess-1',
    game_id: 'slot_mega_fortune_001',
    balance: { amount: 500, currency: 'USD' },
    idle_matrix: [
      ['A', 'K', 'Q'],
      ['J', '10', 'Star'],
      ['Wild', 'Scatter', 'A'],
      ['K', 'Q', 'J'],
      ['10', 'Star', 'Wild'],
    ],
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    config: {
      reels: 5,
      rows: 3,
      paylines: 20,
      currencies: ['USD'],
      min_bet: 0.1,
      max_bet: 100,
      min_lines: 1,
      max_lines: 20,
      default_lines: 20,
      line_defs: [],
      bet_levels: [0.1, 0.5, 1, 5, 10, 50, 100],
      paytable_url: '/paytable',
      paytable: {
        line_wins: [],
        scatter: { symbol: 'Scatter', awards: [] },
        wild: { symbol: 'Wild', substitutes_for: [] },
      },
      rules_url: '/rules',
      rtp: 96.5,
      volatility: 'medium',
      features: [],
    },
    ...overrides,
  };
}

function makeSpinResponse(overrides?: Partial<SpinResponse>): SpinResponse {
  return {
    spin_id: 'spin-1',
    session_id: 'sess-1',
    game_id: 'slot_mega_fortune_001',
    balance: { amount: 510, currency: 'USD' },
    bet: { amount: 1, currency: 'USD', lines: 20 },
    outcome: {
      reel_matrix: [
        ['A', 'A', 'A'],
        ['A', 'A', 'K'],
        ['K', 'Q', 'J'],
        ['10', 'Star', 'Wild'],
        ['Scatter', 'A', 'K'],
      ],
      win: {
        amount: 11,
        currency: 'USD',
        breakdown: [{ type: 'line' as const, line_index: 0, symbol: 'A', count: 5, payout: 11 }],
      },
      bonus_triggered: null,
    },
    next_state: 'idle',
    timestamp: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useGameStore — defaults', () => {
  it('starts with empty token and null session', () => {
    const s = useGameStore.getState();
    expect(s.token).toBe('');
    expect(s.sessionId).toBeNull();
    expect(s.balance).toBe(0);
    expect(s.spinning).toBe(false);
  });
});

describe('setToken', () => {
  it('updates token in store', () => {
    useGameStore.getState().setToken('jwt-abc');
    expect(useGameStore.getState().token).toBe('jwt-abc');
  });

  it('can clear token', () => {
    useGameStore.getState().setToken('jwt-abc');
    useGameStore.getState().setToken('');
    expect(useGameStore.getState().token).toBe('');
  });
});

describe('setInit', () => {
  it('hydrates session, balance, and config from init response', () => {
    useGameStore.getState().setInit(makeInitResponse());
    const s = useGameStore.getState();
    expect(s.sessionId).toBe('sess-1');
    expect(s.balance).toBe(500);
    expect(s.currency).toBe('USD');
    expect(s.minBet).toBe(0.1);
    expect(s.maxBet).toBe(100);
    expect(s.lines).toBe(20);
    expect(s.config).not.toBeNull();
    expect(s.idleMatrix).toHaveLength(5);
  });

  it('clamps bet to min/max from config', () => {
    useGameStore.getState().setInit(
      makeInitResponse({
        config: {
          ...makeInitResponse().config,
          min_bet: 5,
          max_bet: 50,
        },
      })
    );
    const s = useGameStore.getState();
    expect(s.bet).toBeGreaterThanOrEqual(5);
    expect(s.bet).toBeLessThanOrEqual(50);
  });

  it('derives lines correctly with missing default_lines', () => {
    useGameStore.getState().setInit(
      makeInitResponse({
        config: {
          ...makeInitResponse().config,
          min_lines: 1,
          max_lines: 10,
          default_lines: 0, // falsy
        },
      })
    );
    // default_lines=0 → rounds to 0, clamped to max(minLines,0) = 1
    expect(useGameStore.getState().lines).toBeGreaterThanOrEqual(1);
  });
});

describe('setBet', () => {
  it('clamps bet to configured range', () => {
    useGameStore.getState().setInit(makeInitResponse());
    useGameStore.getState().setBet(999);
    expect(useGameStore.getState().bet).toBe(100);

    useGameStore.getState().setBet(-5);
    expect(useGameStore.getState().bet).toBe(0.1);
  });

  it('accepts valid bet within range', () => {
    useGameStore.getState().setInit(makeInitResponse());
    useGameStore.getState().setBet(10);
    expect(useGameStore.getState().bet).toBe(10);
  });
});

describe('setLines', () => {
  it('clamps lines to configured range and rounds', () => {
    useGameStore.getState().setInit(makeInitResponse());
    useGameStore.getState().setLines(100);
    expect(useGameStore.getState().lines).toBe(20);

    useGameStore.getState().setLines(0);
    expect(useGameStore.getState().lines).toBe(1);

    useGameStore.getState().setLines(5.7);
    expect(useGameStore.getState().lines).toBe(6);
  });
});

describe('setSpinning', () => {
  it('clears lastWinAmount when starting a spin', () => {
    const state = useGameStore.getState();
    state.setInit(makeInitResponse());
    state.setSpinResult(makeSpinResponse());
    // pendingWinAmount is set
    expect(useGameStore.getState().pendingWinAmount).toBe(11);

    // Starting a new spin
    useGameStore.getState().setSpinning(true);
    expect(useGameStore.getState().spinning).toBe(true);
    expect(useGameStore.getState().lastWinAmount).toBe(0);
  });

  it('moves pendingWinAmount to lastWinAmount when stopping', () => {
    useGameStore.getState().setInit(makeInitResponse());
    useGameStore.getState().setSpinResult(makeSpinResponse());
    // Simulate reels stopping
    useGameStore.getState().setSpinning(false);
    expect(useGameStore.getState().spinning).toBe(false);
    expect(useGameStore.getState().lastWinAmount).toBe(11);
    expect(useGameStore.getState().pendingWinAmount).toBeNull();
  });
});

describe('setSpinResult', () => {
  it('updates balance and outcome', () => {
    useGameStore.getState().setInit(makeInitResponse());
    useGameStore
      .getState()
      .setSpinResult(makeSpinResponse({ balance: { amount: 510, currency: 'USD' } }));
    const s = useGameStore.getState();
    expect(s.balance).toBe(510);
    expect(s.lastOutcome).not.toBeNull();
    expect(s.pendingWinAmount).toBe(11);
    expect(s.error).toBeNull();
  });

  it('handles zero-win spin', () => {
    useGameStore.getState().setInit(makeInitResponse());
    useGameStore.getState().setSpinResult(
      makeSpinResponse({
        balance: { amount: 499, currency: 'USD' },
        outcome: {
          reel_matrix: [
            ['A', 'K', 'Q'],
            ['J', '10', 'Star'],
            ['Wild', 'Scatter', 'A'],
            ['K', 'Q', 'J'],
            ['10', 'Star', 'Wild'],
          ],
          win: { amount: 0, currency: 'USD', breakdown: [] },
          bonus_triggered: null,
        },
      })
    );
    expect(useGameStore.getState().pendingWinAmount).toBe(0);
    expect(useGameStore.getState().balance).toBe(499);
  });
});

describe('setError', () => {
  it('sets error and stops spinning', () => {
    useGameStore.getState().setSpinning(true);
    useGameStore.getState().setError('Connection failed');
    const s = useGameStore.getState();
    expect(s.error).toBe('Connection failed');
    expect(s.spinning).toBe(false);
    expect(s.pendingWinAmount).toBeNull();
    expect(s.lastWinAmount).toBe(0);
  });

  it('clears error on null', () => {
    useGameStore.getState().setError('oops');
    useGameStore.getState().setError(null);
    expect(useGameStore.getState().error).toBeNull();
  });
});

describe('resetOutcome', () => {
  it('clears outcome and win amounts', () => {
    useGameStore.getState().setInit(makeInitResponse());
    useGameStore.getState().setSpinResult(makeSpinResponse());
    useGameStore.getState().setSpinning(false);
    expect(useGameStore.getState().lastWinAmount).toBe(11);

    useGameStore.getState().resetOutcome();
    const s = useGameStore.getState();
    expect(s.lastOutcome).toBeNull();
    expect(s.lastWinAmount).toBe(0);
    expect(s.pendingWinAmount).toBeNull();
  });
});
