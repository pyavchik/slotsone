import type { SpinOutcome } from './engine/spinEngine.js';
import {
  MIN_BET,
  MAX_BET,
  BET_LEVELS,
  PAYLINES,
  LINE_DEFS,
  REELS,
  ROWS,
  CURRENCY,
  DEFAULT_BALANCE,
  PAYTABLE,
  SYMBOLS,
  SCATTER_FREE_SPINS,
} from './engine/gameConfig.js';
import { runSpin } from './engine/spinEngine.js';
import { randomUUID } from 'crypto';

export interface Session {
  session_id: string;
  user_id: string;
  game_id: string;
  status: 'active' | 'closed';
  created_at: number;
  expires_at: number;
}

export interface Balance {
  user_id: string;
  currency: string;
  amount: number;
}

export interface IdempotencyEntry {
  key: string;
  user_id: string;
  request_fingerprint: string;
  response: unknown;
  created_at: number;
}

const TTL_IDEMPOTENCY_MS = 24 * 60 * 60 * 1000;
const TTL_SESSION_MS = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const RATE_LIMIT_SPINS_PER_SEC = 5;
const MIN_ACTIVE_LINES = 1;
const MAX_ACTIVE_LINES = PAYLINES;
const MAX_HISTORY_ITEMS_PER_USER = 100;
const rateCounts = new Map<string, { count: number; resetAt: number }>();

const sessions = new Map<string, Session>();
const balances = new Map<string, Balance>(); // key: `${user_id}:${currency}`
const idempotency = new Map<string, IdempotencyEntry>();
const historyByUser = new Map<string, SpinResult[]>();

const lineWins = SYMBOLS.map((symbol, index) => {
  const [x3, x4, x5] = PAYTABLE[index] ?? [0, 0, 0];
  return { symbol, x3, x4, x5 };
})
  .filter((item) => item.x3 > 0 || item.x4 > 0 || item.x5 > 0)
  .sort((a, b) => b.x5 - a.x5);

const paytableConfig = {
  line_wins: lineWins,
  scatter: {
    symbol: 'Scatter',
    awards: SCATTER_FREE_SPINS.map(([count, freeSpins]) => ({ count, free_spins: freeSpins })),
  },
  wild: {
    symbol: 'Wild',
    substitutes_for: lineWins.map((item) => item.symbol),
  },
} as const;

function balanceKey(userId: string, currency: string): string {
  return `${userId}:${currency}`;
}

function idempotencyKeyForUser(userId: string, key: string): string {
  return `${userId}:${key}`;
}

function spinFingerprint(
  sessionId: string,
  gameId: string,
  betAmount: number,
  currency: string,
  lines: number
): string {
  return `${sessionId}|${gameId}|${betAmount.toFixed(2)}|${currency}|${lines}`;
}

function ensureBalance(userId: string, currency: string): Balance {
  const key = balanceKey(userId, currency);
  let b = balances.get(key);
  if (!b) {
    b = { user_id: userId, currency, amount: DEFAULT_BALANCE };
    balances.set(key, b);
  }
  return b;
}

function cleanupExpiredSessions(now = Date.now()) {
  sessions.forEach((session, key) => {
    if (session.status !== 'active' || now > session.expires_at) sessions.delete(key);
  });
}

function cleanupExpiredRateCounts(now = Date.now()) {
  rateCounts.forEach((entry, key) => {
    if (now >= entry.resetAt) rateCounts.delete(key);
  });
}

function isIdempotencyExpired(entry: IdempotencyEntry, now = Date.now()): boolean {
  return now - entry.created_at >= TTL_IDEMPOTENCY_MS;
}

function cleanupExpiredIdempotency(now = Date.now()) {
  idempotency.forEach((entry, key) => {
    if (isIdempotencyExpired(entry, now)) idempotency.delete(key);
  });
}

function cleanupExpiredState(now = Date.now()) {
  cleanupExpiredSessions(now);
  cleanupExpiredRateCounts(now);
  cleanupExpiredIdempotency(now);
}

setInterval(() => {
  cleanupExpiredState();
}, CLEANUP_INTERVAL_MS).unref();

function rateLimit(
  userId: string
): { limited: false } | { limited: true; retryAfterSeconds: number } {
  const now = Date.now();
  let entry = rateCounts.get(userId);
  if (!entry) {
    rateCounts.set(userId, { count: 1, resetAt: now + 1000 });
    return { limited: false };
  }
  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + 1000 };
    rateCounts.set(userId, entry);
    return { limited: false };
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_SPINS_PER_SEC) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return { limited: false };
}

function appendHistory(userId: string, result: SpinResult) {
  const existing = historyByUser.get(userId) ?? [];
  existing.unshift(result);
  if (existing.length > MAX_HISTORY_ITEMS_PER_USER) existing.length = MAX_HISTORY_ITEMS_PER_USER;
  historyByUser.set(userId, existing);
}

export function createSession(userId: string, gameId: string): Session {
  cleanupExpiredState();
  const session_id = `sess_${randomUUID().slice(0, 12)}`;
  const now = Date.now();
  const session: Session = {
    session_id,
    user_id: userId,
    game_id: gameId,
    status: 'active',
    created_at: now,
    expires_at: now + TTL_SESSION_MS,
  };
  sessions.set(session_id, session);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  const s = sessions.get(sessionId);
  if (!s) return undefined;
  if (s.status !== 'active' || Date.now() > s.expires_at) {
    sessions.delete(sessionId);
    return undefined;
  }
  return s;
}

export function getConfig() {
  return {
    reels: REELS,
    rows: ROWS,
    paylines: PAYLINES,
    currencies: [CURRENCY],
    min_bet: MIN_BET,
    max_bet: MAX_BET,
    min_lines: MIN_ACTIVE_LINES,
    max_lines: MAX_ACTIVE_LINES,
    default_lines: MAX_ACTIVE_LINES,
    line_defs: LINE_DEFS,
    bet_levels: BET_LEVELS,
    paytable_url: '',
    paytable: paytableConfig,
    rules_url: '',
    rtp: 96.5,
    volatility: 'high' as const,
    features: ['free_spins', 'multipliers', 'scatter'],
  };
}

export interface SpinResult {
  spin_id: string;
  session_id: string;
  game_id: string;
  balance: { amount: number; currency: string };
  bet: { amount: number; currency: string; lines: number };
  outcome: SpinOutcome;
  next_state: string;
  timestamp: number;
}

export function executeSpin(
  userId: string,
  sessionId: string,
  gameId: string,
  betAmount: number,
  currency: string,
  lines: number,
  idempotencyKey?: string
):
  | { result: SpinResult; code: 200 }
  | { error: string; code: 400 | 401 | 403 | 409 | 422 | 429; retry_after_seconds?: number } {
  const session = getSession(sessionId);
  if (!session) {
    return { error: 'Session not found or expired', code: 403 };
  }
  if (session.user_id !== userId) {
    return { error: 'Forbidden', code: 403 };
  }
  if (session.game_id !== gameId) {
    return { error: 'Invalid game for session', code: 400 };
  }

  if (betAmount < MIN_BET || betAmount > MAX_BET) {
    return { error: 'Bet amount out of range', code: 422 };
  }
  if (currency !== CURRENCY) {
    return { error: 'Invalid currency', code: 422 };
  }
  if (!Number.isInteger(lines) || lines < MIN_ACTIVE_LINES || lines > MAX_ACTIVE_LINES) {
    return { error: 'Invalid lines count', code: 422 };
  }

  const requestFingerprint = spinFingerprint(sessionId, gameId, betAmount, currency, lines);
  if (idempotencyKey) {
    const scopedKey = idempotencyKeyForUser(userId, idempotencyKey);
    const existing = idempotency.get(scopedKey);
    if (existing) {
      if (isIdempotencyExpired(existing)) {
        idempotency.delete(scopedKey);
      } else {
        if (existing.request_fingerprint !== requestFingerprint) {
          return { error: 'Idempotency key reused with different request payload', code: 409 };
        }
        return { result: existing.response as SpinResult, code: 200 };
      }
    }
  }

  const bal = ensureBalance(userId, currency);
  if (bal.amount < betAmount) {
    return { error: 'insufficient_balance', code: 422 };
  }

  const rate = rateLimit(userId);
  if (rate.limited) {
    return { error: 'Too many requests', code: 429, retry_after_seconds: rate.retryAfterSeconds };
  }

  const { outcome } = runSpin(betAmount, currency, lines);
  bal.amount = Math.round((bal.amount - betAmount + outcome.win.amount) * 100) / 100;

  const finishedAt = Date.now();
  const spin_id = `spin_${randomUUID().slice(0, 12)}`;
  const result: SpinResult = {
    spin_id,
    session_id: sessionId,
    game_id: gameId,
    balance: { amount: bal.amount, currency: bal.currency },
    bet: { amount: betAmount, currency, lines },
    outcome,
    next_state: outcome.bonus_triggered ? 'free_spins' : 'base_game',
    timestamp: finishedAt,
  };

  appendHistory(userId, result);

  if (idempotencyKey) {
    const scopedKey = idempotencyKeyForUser(userId, idempotencyKey);
    idempotency.set(scopedKey, {
      key: idempotencyKey,
      user_id: userId,
      request_fingerprint: requestFingerprint,
      response: result,
      created_at: finishedAt,
    });
  }

  return { result, code: 200 };
}

export function getBalance(userId: string, currency: string): Balance {
  return ensureBalance(userId, currency);
}

export function getHistory(userId: string, limit = 50, offset = 0) {
  const clampedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const clampedOffset = Math.max(0, Math.floor(offset));
  const items = historyByUser.get(userId) ?? [];
  return {
    items: items.slice(clampedOffset, clampedOffset + clampedLimit),
    total: items.length,
    limit: clampedLimit,
    offset: clampedOffset,
  };
}

export function cleanupStoreForTests(now: number) {
  cleanupExpiredState(now);
}

export function getStoreDiagnosticsForTests() {
  return {
    sessions: sessions.size,
    balances: balances.size,
    idempotency: idempotency.size,
    historyUsers: historyByUser.size,
    rateCounts: rateCounts.size,
  };
}

export function resetStoreForTests() {
  sessions.clear();
  balances.clear();
  idempotency.clear();
  historyByUser.clear();
  rateCounts.clear();
}
