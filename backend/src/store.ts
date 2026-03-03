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
  PAYTABLE,
  SYMBOLS,
  SCATTER_FREE_SPINS,
} from './engine/gameConfig.js';
import { runSpin } from './engine/spinEngine.js';
import { randomUUID } from 'crypto';
import { getOrCreateWallet, debitWallet, creditWallet } from './walletStore.js';
import { getOrCreateActiveSeedPair, incrementNonce } from './seedStore.js';
import { deriveSpinSeed, hashOutcome } from './provablyFair.js';
import { createRound, getUserRounds, getUserSummary, type HistoryFilters } from './roundStore.js';
import { getPool } from './db.js';

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

async function cleanupExpiredSessions(now = Date.now()) {
  await getPool().query('DELETE FROM game_sessions WHERE status != $1 OR expires_at <= $2', [
    'active',
    now,
  ]);
}

async function cleanupExpiredRateCounts(now = Date.now()) {
  await getPool().query('DELETE FROM rate_limits WHERE reset_at <= $1', [now]);
}

async function cleanupExpiredIdempotency(now = Date.now()) {
  const cutoff = now - TTL_IDEMPOTENCY_MS;
  await getPool().query('DELETE FROM idempotency_keys WHERE created_at <= $1', [cutoff]);
}

async function cleanupExpiredState(now = Date.now()) {
  await Promise.all([
    cleanupExpiredSessions(now),
    cleanupExpiredRateCounts(now),
    cleanupExpiredIdempotency(now),
  ]);
}

const cleanupTimer = setInterval(() => {
  cleanupExpiredState().catch(() => {});
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

async function rateLimit(
  userId: string
): Promise<{ limited: false } | { limited: true; retryAfterSeconds: number }> {
  const now = Date.now();
  const resetAt = now + 1000;

  // Atomic upsert: if the window expired, reset to 1; otherwise increment.
  const { rows } = await getPool().query<{ spin_count: number; reset_at: string }>(
    `INSERT INTO rate_limits (user_id, spin_count, reset_at)
     VALUES ($1, 1, $2)
     ON CONFLICT (user_id) DO UPDATE
     SET spin_count = CASE
           WHEN rate_limits.reset_at <= $3 THEN 1
           ELSE rate_limits.spin_count + 1
         END,
         reset_at = CASE
           WHEN rate_limits.reset_at <= $3 THEN $2
           ELSE rate_limits.reset_at
         END
     RETURNING spin_count, reset_at`,
    [userId, resetAt, now]
  );

  const entry = rows[0];
  if (entry.spin_count > RATE_LIMIT_SPINS_PER_SEC) {
    const storedResetAt = Number(entry.reset_at);
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((storedResetAt - now) / 1000)),
    };
  }
  return { limited: false };
}

export async function createSession(userId: string, gameId: string): Promise<Session> {
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

  await getPool().query(
    `INSERT INTO game_sessions (session_id, user_id, game_id, status, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      session.session_id,
      session.user_id,
      session.game_id,
      session.status,
      session.created_at,
      session.expires_at,
    ]
  );

  return session;
}

export async function getSession(sessionId: string): Promise<Session | undefined> {
  const now = Date.now();
  const { rows } = await getPool().query<{
    session_id: string;
    user_id: string;
    game_id: string;
    status: string;
    created_at: string;
    expires_at: string;
  }>(
    `SELECT session_id, user_id, game_id, status, created_at, expires_at
     FROM game_sessions
     WHERE session_id = $1 AND status = 'active' AND expires_at > $2`,
    [sessionId, now]
  );

  if (rows.length === 0) return undefined;

  const row = rows[0];
  return {
    session_id: row.session_id,
    user_id: row.user_id,
    game_id: row.game_id,
    status: row.status as 'active' | 'closed',
    created_at: Number(row.created_at),
    expires_at: Number(row.expires_at),
  };
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

export async function executeSpin(
  userId: string,
  sessionId: string,
  gameId: string,
  betAmount: number,
  currency: string,
  lines: number,
  idempotencyKey?: string
): Promise<
  | { result: SpinResult; code: 200 }
  | { error: string; code: 400 | 401 | 403 | 409 | 422 | 429; retry_after_seconds?: number }
> {
  const session = await getSession(sessionId);
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
    const now = Date.now();
    const cutoff = now - TTL_IDEMPOTENCY_MS;
    const { rows } = await getPool().query<{
      request_fingerprint: string;
      response: unknown;
      created_at: string;
    }>(
      `SELECT request_fingerprint, response, created_at
       FROM idempotency_keys
       WHERE scoped_key = $1`,
      [scopedKey]
    );

    if (rows.length > 0) {
      const existing = rows[0];
      const createdAt = Number(existing.created_at);
      if (createdAt <= cutoff) {
        // Expired — remove it
        await getPool().query('DELETE FROM idempotency_keys WHERE scoped_key = $1', [scopedKey]);
      } else {
        if (existing.request_fingerprint !== requestFingerprint) {
          return { error: 'Idempotency key reused with different request payload', code: 409 };
        }
        return { result: existing.response as SpinResult, code: 200 };
      }
    }
  }

  // Get wallet from DB
  const wallet = await getOrCreateWallet(userId);
  const betCents = Math.round(betAmount * 100);
  if (wallet.balance_cents < betCents) {
    return { error: 'insufficient_balance', code: 422 };
  }

  const rate = await rateLimit(userId);
  if (rate.limited) {
    return { error: 'Too many requests', code: 429, retry_after_seconds: rate.retryAfterSeconds };
  }

  // Provably fair: get seed pair, increment nonce, derive seed
  const seedPair = await getOrCreateActiveSeedPair(userId);
  const nonce = await incrementNonce(seedPair.id);
  const spinSeed = deriveSpinSeed(seedPair.server_seed, seedPair.client_seed, nonce);

  // Debit wallet (optimistic locking)
  const balanceBeforeCents = wallet.balance_cents;
  const debitedWallet = await debitWallet(userId, betCents, wallet.version);
  if (!debitedWallet) {
    return { error: 'insufficient_balance', code: 422 };
  }

  // Run spin with derived seed
  const { outcome } = runSpin(betAmount, currency, lines, spinSeed);
  const winCents = Math.round(outcome.win.amount * 100);
  const outcomeHash = hashOutcome(outcome);

  // Credit winnings
  let finalWallet = debitedWallet;
  if (winCents > 0) {
    finalWallet = await creditWallet(userId, winCents);
  }

  const balanceAfterCents = finalWallet.balance_cents;
  const finishedAt = Date.now();

  // Persist round + transactions
  const round = await createRound({
    userId,
    sessionId,
    gameId,
    seedPairId: seedPair.id,
    nonce,
    betCents,
    winCents,
    currency,
    lines,
    balanceBeforeCents,
    balanceAfterCents,
    reelMatrix: outcome.reel_matrix,
    winBreakdown: outcome.win.breakdown,
    bonusTriggered: outcome.bonus_triggered,
    outcomeHash,
    balanceAfterBetCents: debitedWallet.balance_cents,
  });

  const result: SpinResult = {
    spin_id: round.id,
    session_id: sessionId,
    game_id: gameId,
    balance: { amount: balanceAfterCents / 100, currency },
    bet: { amount: betAmount, currency, lines },
    outcome,
    next_state: outcome.bonus_triggered ? 'free_spins' : 'base_game',
    timestamp: finishedAt,
  };

  if (idempotencyKey) {
    const scopedKey = idempotencyKeyForUser(userId, idempotencyKey);
    await getPool().query(
      `INSERT INTO idempotency_keys (scoped_key, user_id, request_fingerprint, response, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (scoped_key) DO NOTHING`,
      [scopedKey, userId, requestFingerprint, JSON.stringify(result), finishedAt]
    );
  }

  return { result, code: 200 };
}

export async function getBalance(userId: string, currency: string): Promise<Balance> {
  const wallet = await getOrCreateWallet(userId);
  return {
    user_id: userId,
    currency,
    amount: wallet.balance_cents / 100,
  };
}

export async function getHistory(userId: string, limit = 50, offset = 0, filters?: HistoryFilters) {
  const result = await getUserRounds(userId, { ...filters, limit, offset });
  // Convert DB rounds to the SpinResult shape for backward compat
  const items: SpinResult[] = result.items.map((round) => ({
    spin_id: round.id,
    session_id: round.session_id,
    game_id: round.game_id,
    balance: { amount: round.balance_after_cents / 100, currency: round.currency },
    bet: { amount: round.bet_cents / 100, currency: round.currency, lines: round.lines },
    outcome: {
      reel_matrix: round.reel_matrix,
      win: {
        amount: round.win_cents / 100,
        currency: round.currency,
        breakdown: round.win_breakdown as SpinOutcome['win']['breakdown'],
      },
      bonus_triggered: round.bonus_triggered as SpinOutcome['bonus_triggered'],
    },
    next_state: round.bonus_triggered ? 'free_spins' : 'base_game',
    timestamp: new Date(round.created_at).getTime(),
  }));
  return { items, total: result.total, limit: result.limit, offset: result.offset };
}

export async function getHistorySummary(userId: string, filters?: HistoryFilters) {
  return getUserSummary(userId, filters);
}

export async function cleanupStoreForTests(now: number) {
  await cleanupExpiredState(now);
}

export async function getStoreDiagnosticsForTests() {
  const pool = getPool();
  const [sessRes, idempRes, rateRes] = await Promise.all([
    pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM game_sessions'),
    pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM idempotency_keys'),
    pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM rate_limits'),
  ]);
  return {
    sessions: Number(sessRes.rows[0].count),
    idempotency: Number(idempRes.rows[0].count),
    rateCounts: Number(rateRes.rows[0].count),
  };
}

export async function resetStoreForTests() {
  const pool = getPool();
  await pool.query('TRUNCATE game_sessions, idempotency_keys, rate_limits');
}
