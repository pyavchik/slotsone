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
import { runSpin, buildIdleMatrix as buildMegaFortuneIdleMatrix } from './engine/spinEngine.js';
import {
  BOD_MIN_BET,
  BOD_MAX_BET,
  BOD_BET_LEVELS,
  BOD_PAYLINES,
  BOD_LINE_DEFS,
  BOD_REELS,
  BOD_ROWS,
  BOD_CURRENCY,
  BOD_PAYTABLE,
  BOD_SYMBOLS,
  BOD_SCATTER_FREE_SPINS,
  BOD_GAME_ID,
} from './engine/bookOfDeadConfig.js';
import { runBookOfDeadSpin, buildBookOfDeadIdleMatrix } from './engine/bookOfDeadEngine.js';
import { randomUUID } from 'crypto';
import { getOrCreateWallet, debitWallet, creditWallet } from './walletStore.js';
import { getOrCreateActiveSeedPair, incrementNonce } from './seedStore.js';
import { deriveSpinSeed, hashOutcome } from './provablyFair.js';
import { createRound, getUserRounds, getUserSummary, type HistoryFilters } from './roundStore.js';
import { getPool } from './db.js';
import { getLogger } from './logger.js';
import { ROULETTE_CONFIG, ROULETTE_GAME_ID } from './engine/rouletteConfig.js';
import {
  validateRouletteBets,
  type RouletteBet as RouletteBetInput,
} from './engine/rouletteValidation.js';
import { runRouletteSpin, type RouletteOutcome } from './engine/rouletteEngine.js';
import {
  AMERICAN_ROULETTE_CONFIG,
  AMERICAN_ROULETTE_GAME_ID,
} from './engine/americanRouletteConfig.js';
import {
  validateAmericanRouletteBets,
  type AmericanRouletteBet as AmericanRouletteBetInput,
} from './engine/americanRouletteValidation.js';
import {
  runAmericanRouletteSpin,
  type AmericanRouletteOutcome,
} from './engine/americanRouletteEngine.js';

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

// Book of Dead paytable config (uses 2/3/4/5 of a kind)
const bodLineWins = BOD_SYMBOLS.map((symbol, index) => {
  const [x2, x3, x4, x5] = BOD_PAYTABLE[index] ?? [0, 0, 0, 0];
  return { symbol, x2, x3, x4, x5 };
})
  .filter((item) => item.x2 > 0 || item.x3 > 0 || item.x4 > 0 || item.x5 > 0)
  .sort((a, b) => b.x5 - a.x5);

const bodPaytableConfig = {
  line_wins: bodLineWins,
  scatter: {
    symbol: 'Book',
    awards: BOD_SCATTER_FREE_SPINS.map(([count, freeSpins]) => ({ count, free_spins: freeSpins })),
  },
  wild: {
    symbol: 'Book',
    substitutes_for: bodLineWins.map((item) => item.symbol),
  },
} as const;

interface SlotGameEntry {
  minBet: number;
  maxBet: number;
  currency: string;
  minLines: number;
  maxLines: number;
  runSpin: (
    betAmount: number,
    currency: string,
    lines: number,
    seed: number
  ) => { outcome: SpinOutcome; seedUsed: number };
  buildIdleMatrix: () => string[][];
  getConfig: () => ReturnType<typeof getSlotConfig>;
}

function getSlotConfig(
  reels: number,
  rows: number,
  paylines: number,
  currencies: string[],
  minBet: number,
  maxBet: number,
  maxLines: number,
  lineDefs: number[][],
  betLevels: number[],
  paytable: unknown,
  rtp: number,
  volatility: string,
  features: string[]
) {
  return {
    reels,
    rows,
    paylines,
    currencies,
    min_bet: minBet,
    max_bet: maxBet,
    min_lines: 1,
    max_lines: maxLines,
    default_lines: maxLines,
    line_defs: lineDefs,
    bet_levels: betLevels,
    paytable_url: '',
    paytable,
    rules_url: '',
    rtp,
    volatility,
    features,
  };
}

const SLOT_GAME_REGISTRY: Record<string, SlotGameEntry> = {
  slot_mega_fortune_001: {
    minBet: MIN_BET,
    maxBet: MAX_BET,
    currency: CURRENCY,
    minLines: 1,
    maxLines: PAYLINES,
    runSpin: (betAmount, currency, lines, seed) => runSpin(betAmount, currency, lines, seed),
    buildIdleMatrix: buildMegaFortuneIdleMatrix,
    getConfig: () =>
      getSlotConfig(
        REELS,
        ROWS,
        PAYLINES,
        [CURRENCY],
        MIN_BET,
        MAX_BET,
        PAYLINES,
        LINE_DEFS,
        BET_LEVELS,
        paytableConfig,
        96.5,
        'high',
        ['free_spins', 'multipliers', 'scatter']
      ),
  },
  [BOD_GAME_ID]: {
    minBet: BOD_MIN_BET,
    maxBet: BOD_MAX_BET,
    currency: BOD_CURRENCY,
    minLines: 1,
    maxLines: BOD_PAYLINES,
    runSpin: (betAmount, currency, lines, seed) =>
      runBookOfDeadSpin(betAmount, currency, lines, seed),
    buildIdleMatrix: buildBookOfDeadIdleMatrix,
    getConfig: () =>
      getSlotConfig(
        BOD_REELS,
        BOD_ROWS,
        BOD_PAYLINES,
        [BOD_CURRENCY],
        BOD_MIN_BET,
        BOD_MAX_BET,
        BOD_PAYLINES,
        BOD_LINE_DEFS,
        BOD_BET_LEVELS,
        bodPaytableConfig,
        96.21,
        'high',
        ['free_spins', 'expanding_symbol', 'wild_scatter']
      ),
  },
};

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

function rouletteFingerprint(
  sessionId: string,
  gameId: string,
  bets: RouletteBetInput[],
  currency: string
): string {
  const normalizedBets = bets
    .map((b) => ({ ...b, numbers: [...b.numbers].sort((a, b) => a - b) }))
    .sort((a, b) => a.type.localeCompare(b.type));
  return `${sessionId}|${gameId}|${currency}|${JSON.stringify(normalizedBets)}`;
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

export function getConfig(gameId?: string) {
  const slotGame = SLOT_GAME_REGISTRY[gameId ?? 'slot_mega_fortune_001'];
  if (slotGame) {
    return slotGame.getConfig();
  }
  // Default to Mega Fortune for backward compatibility
  return SLOT_GAME_REGISTRY['slot_mega_fortune_001']!.getConfig();
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

export interface RouletteSpinResult {
  spin_id: string;
  session_id: string;
  game_id: string;
  balance: { amount: number; currency: string };
  total_bet: number;
  outcome: RouletteOutcome;
  timestamp: number;
}

export interface AmericanRouletteSpinResult {
  spin_id: string;
  session_id: string;
  game_id: string;
  balance: { amount: number; currency: string };
  total_bet: number;
  outcome: AmericanRouletteOutcome;
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
  const log = getLogger();
  const startedAt = Date.now();

  log.info({ userId, sessionId, gameId, betAmount, currency, lines }, 'spin_initiated');

  const session = await getSession(sessionId);
  if (!session) {
    log.warn({ userId, sessionId, reason: 'session_not_found' }, 'spin_rejected');
    return { error: 'Session not found or expired', code: 403 };
  }
  if (session.user_id !== userId) {
    log.warn({ userId, sessionId, reason: 'forbidden' }, 'spin_rejected');
    return { error: 'Forbidden', code: 403 };
  }
  if (session.game_id !== gameId) {
    log.warn({ userId, sessionId, reason: 'invalid_game' }, 'spin_rejected');
    return { error: 'Invalid game for session', code: 400 };
  }

  const slotGame = SLOT_GAME_REGISTRY[gameId];
  if (!slotGame) {
    log.warn({ userId, sessionId, gameId, reason: 'unknown_slot_game' }, 'spin_rejected');
    return { error: 'Unknown slot game', code: 400 };
  }

  if (betAmount < slotGame.minBet || betAmount > slotGame.maxBet) {
    log.warn({ userId, sessionId, betAmount, reason: 'bet_out_of_range' }, 'spin_rejected');
    return { error: 'Bet amount out of range', code: 422 };
  }
  if (currency !== slotGame.currency) {
    log.warn({ userId, sessionId, currency, reason: 'invalid_currency' }, 'spin_rejected');
    return { error: 'Invalid currency', code: 422 };
  }
  if (!Number.isInteger(lines) || lines < slotGame.minLines || lines > slotGame.maxLines) {
    log.warn({ userId, sessionId, lines, reason: 'invalid_lines' }, 'spin_rejected');
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
        await getPool().query('DELETE FROM idempotency_keys WHERE scoped_key = $1', [scopedKey]);
      } else {
        if (existing.request_fingerprint !== requestFingerprint) {
          log.warn({ userId, sessionId, reason: 'idempotency_mismatch' }, 'spin_rejected');
          return { error: 'Idempotency key reused with different request payload', code: 409 };
        }
        return { result: existing.response as SpinResult, code: 200 };
      }
    }
  }

  const wallet = await getOrCreateWallet(userId);
  const betCents = Math.round(betAmount * 100);
  if (wallet.balance_cents < betCents) {
    log.warn(
      {
        userId,
        sessionId,
        betCents,
        balanceCents: wallet.balance_cents,
        reason: 'insufficient_balance',
      },
      'spin_rejected'
    );
    return { error: 'insufficient_balance', code: 422 };
  }

  const rate = await rateLimit(userId);
  if (rate.limited) {
    log.warn({ userId, sessionId, reason: 'rate_limited' }, 'spin_rejected');
    return { error: 'Too many requests', code: 429, retry_after_seconds: rate.retryAfterSeconds };
  }

  try {
    const seedPair = await getOrCreateActiveSeedPair(userId);
    const nonce = await incrementNonce(seedPair.id);
    const spinSeed = deriveSpinSeed(seedPair.server_seed, seedPair.client_seed, nonce);

    const balanceBeforeCents = wallet.balance_cents;
    const debitedWallet = await debitWallet(userId, betCents, wallet.version);
    if (!debitedWallet) {
      log.warn({ userId, sessionId, betCents, reason: 'debit_failed' }, 'spin_rejected');
      return { error: 'insufficient_balance', code: 422 };
    }

    log.info(
      {
        userId,
        amountCents: betCents,
        balanceBeforeCents,
        balanceAfterCents: debitedWallet.balance_cents,
      },
      'wallet_debit'
    );

    const { outcome } = slotGame.runSpin(betAmount, currency, lines, spinSeed);
    const winCents = Math.round(outcome.win.amount * 100);
    const outcomeHash = hashOutcome(outcome);

    let finalWallet = debitedWallet;
    if (winCents > 0) {
      const balanceBeforeCredit = debitedWallet.balance_cents;
      finalWallet = await creditWallet(userId, winCents);
      log.info(
        {
          userId,
          amountCents: winCents,
          balanceBeforeCents: balanceBeforeCredit,
          balanceAfterCents: finalWallet.balance_cents,
        },
        'wallet_credit'
      );
    }

    const balanceAfterCents = finalWallet.balance_cents;
    const finishedAt = Date.now();

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

    const durationMs = finishedAt - startedAt;
    log.info(
      {
        spinId: round.id,
        userId,
        sessionId,
        gameId,
        betCents,
        winCents,
        balanceAfterCents,
        isWin: winCents > 0,
        bonusTriggered: !!outcome.bonus_triggered,
        nonce,
        durationMs,
      },
      'spin_completed'
    );

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
  } catch (err) {
    log.error({ err, userId, sessionId, gameId }, 'spin_error');
    throw err;
  }
}

export async function createRouletteSession(userId: string) {
  return createSession(userId, ROULETTE_GAME_ID);
}

export async function executeRouletteSpin(
  userId: string,
  sessionId: string,
  gameId: string,
  bets: RouletteBetInput[],
  currency: string,
  idempotencyKey?: string
): Promise<
  | { result: RouletteSpinResult; code: 200 }
  | { error: string; code: 400 | 401 | 403 | 409 | 422 | 429; retry_after_seconds?: number }
> {
  const log = getLogger();
  const startedAt = Date.now();
  const betCount = bets.length;
  const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);

  log.info({ userId, sessionId, gameId, betCount, totalBet, currency }, 'roulette_spin_initiated');

  const session = await getSession(sessionId);
  if (!session) {
    log.warn({ userId, sessionId, reason: 'session_not_found' }, 'roulette_spin_rejected');
    return { error: 'Session not found or expired', code: 403 };
  }
  if (session.user_id !== userId) {
    log.warn({ userId, sessionId, reason: 'forbidden' }, 'roulette_spin_rejected');
    return { error: 'Forbidden', code: 403 };
  }
  if (session.game_id !== gameId) {
    log.warn({ userId, sessionId, reason: 'invalid_game' }, 'roulette_spin_rejected');
    return { error: 'Invalid game for session', code: 400 };
  }

  const validation = validateRouletteBets(bets);
  if (!validation.valid) {
    log.warn(
      { userId, sessionId, reason: 'invalid_bets', detail: validation.error },
      'roulette_spin_rejected'
    );
    return { error: validation.error, code: 400 };
  }

  if (totalBet <= 0) {
    log.warn({ userId, sessionId, reason: 'zero_bet' }, 'roulette_spin_rejected');
    return { error: 'Total bet must be positive', code: 422 };
  }

  if (!ROULETTE_CONFIG.currencies.includes(currency)) {
    log.warn({ userId, sessionId, currency, reason: 'invalid_currency' }, 'roulette_spin_rejected');
    return { error: 'Invalid currency', code: 422 };
  }

  const requestFingerprint = rouletteFingerprint(sessionId, gameId, bets, currency);
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
       FROM idempotency_keys WHERE scoped_key = $1`,
      [scopedKey]
    );

    if (rows.length > 0) {
      const existing = rows[0];
      const createdAt = Number(existing.created_at);
      if (createdAt <= cutoff) {
        await getPool().query('DELETE FROM idempotency_keys WHERE scoped_key = $1', [scopedKey]);
      } else {
        if (existing.request_fingerprint !== requestFingerprint) {
          log.warn({ userId, sessionId, reason: 'idempotency_mismatch' }, 'roulette_spin_rejected');
          return { error: 'Idempotency key reused with different request payload', code: 409 };
        }
        return { result: existing.response as RouletteSpinResult, code: 200 };
      }
    }
  }

  const wallet = await getOrCreateWallet(userId);
  const totalBetCents = Math.round(totalBet * 100);
  if (wallet.balance_cents < totalBetCents) {
    log.warn(
      {
        userId,
        sessionId,
        totalBetCents,
        balanceCents: wallet.balance_cents,
        reason: 'insufficient_balance',
      },
      'roulette_spin_rejected'
    );
    return { error: 'insufficient_balance', code: 422 };
  }

  const rate = await rateLimit(userId);
  if (rate.limited) {
    log.warn({ userId, sessionId, reason: 'rate_limited' }, 'roulette_spin_rejected');
    return { error: 'Too many requests', code: 429, retry_after_seconds: rate.retryAfterSeconds };
  }

  try {
    const seedPair = await getOrCreateActiveSeedPair(userId);
    const nonce = await incrementNonce(seedPair.id);
    const spinSeed = deriveSpinSeed(seedPair.server_seed, seedPair.client_seed, nonce);

    const balanceBeforeCents = wallet.balance_cents;
    const debitedWallet = await debitWallet(userId, totalBetCents, wallet.version);
    if (!debitedWallet) {
      log.warn(
        { userId, sessionId, totalBetCents, reason: 'debit_failed' },
        'roulette_spin_rejected'
      );
      return { error: 'insufficient_balance', code: 422 };
    }

    log.info(
      {
        userId,
        amountCents: totalBetCents,
        balanceBeforeCents,
        balanceAfterCents: debitedWallet.balance_cents,
      },
      'wallet_debit'
    );

    const outcome = runRouletteSpin(bets, currency, spinSeed);
    const winCents = Math.round(outcome.win.amount * 100);

    let finalWallet = debitedWallet;
    if (winCents > 0) {
      const balanceBeforeCredit = debitedWallet.balance_cents;
      finalWallet = await creditWallet(userId, winCents);
      log.info(
        {
          userId,
          amountCents: winCents,
          balanceBeforeCents: balanceBeforeCredit,
          balanceAfterCents: finalWallet.balance_cents,
        },
        'wallet_credit'
      );
    }

    const balanceAfterCents = finalWallet.balance_cents;
    const finishedAt = Date.now();

    const rouletteBets = outcome.win.breakdown.map((b) => ({
      bet_type: b.bet_type,
      numbers: b.numbers,
      amount_cents: Math.round(b.bet_amount * 100),
      payout_cents: Math.round(b.payout * 100),
      profit_cents: Math.round(b.profit * 100),
      la_partage: b.la_partage,
      won: b.won,
    }));

    const round = await createRound({
      userId,
      sessionId,
      gameId,
      seedPairId: seedPair.id,
      nonce,
      betCents: totalBetCents,
      winCents,
      currency,
      lines: bets.length,
      balanceBeforeCents,
      balanceAfterCents,
      reelMatrix: {
        winning_number: outcome.winning_number,
        winning_color: outcome.winning_color,
        wheel_position: outcome.wheel_position,
      } as unknown as string[][],
      winBreakdown: outcome.win.breakdown,
      bonusTriggered: null,
      outcomeHash: null,
      balanceAfterBetCents: debitedWallet.balance_cents,
      rouletteBets,
      rouletteResult: {
        userId,
        winningNumber: outcome.winning_number,
        winningColor: outcome.winning_color,
      },
    });

    const durationMs = finishedAt - startedAt;
    log.info(
      {
        spinId: round.id,
        userId,
        sessionId,
        gameId,
        betCents: totalBetCents,
        winCents,
        balanceAfterCents,
        isWin: winCents > 0,
        betCount,
        winningNumber: outcome.winning_number,
        winningColor: outcome.winning_color,
        wheelPosition: outcome.wheel_position,
        nonce,
        durationMs,
      },
      'roulette_spin_completed'
    );

    const result: RouletteSpinResult = {
      spin_id: round.id,
      session_id: sessionId,
      game_id: gameId,
      balance: { amount: balanceAfterCents / 100, currency },
      total_bet: totalBet,
      outcome,
      timestamp: finishedAt,
    };

    if (idempotencyKey) {
      const scopedKey = idempotencyKeyForUser(userId, idempotencyKey);
      await getPool().query(
        `INSERT INTO idempotency_keys (scoped_key, user_id, request_fingerprint, response, created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (scoped_key) DO NOTHING`,
        [scopedKey, userId, requestFingerprint, JSON.stringify(result), finishedAt]
      );
    }

    return { result, code: 200 };
  } catch (err) {
    log.error({ err, userId, sessionId, gameId, betCount }, 'roulette_spin_error');
    throw err;
  }
}

export async function createAmericanRouletteSession(userId: string) {
  return createSession(userId, AMERICAN_ROULETTE_GAME_ID);
}

function americanRouletteFingerprint(
  sessionId: string,
  gameId: string,
  bets: AmericanRouletteBetInput[],
  currency: string
): string {
  const normalizedBets = bets
    .map((b) => ({ ...b, numbers: [...b.numbers].sort((a, b) => a - b) }))
    .sort((a, b) => a.type.localeCompare(b.type));
  return `${sessionId}|${gameId}|${currency}|${JSON.stringify(normalizedBets)}`;
}

export async function executeAmericanRouletteSpin(
  userId: string,
  sessionId: string,
  gameId: string,
  bets: AmericanRouletteBetInput[],
  currency: string,
  idempotencyKey?: string
): Promise<
  | { result: AmericanRouletteSpinResult; code: 200 }
  | { error: string; code: 400 | 401 | 403 | 409 | 422 | 429; retry_after_seconds?: number }
> {
  const log = getLogger();
  const startedAt = Date.now();
  const betCount = bets.length;
  const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);

  log.info(
    { userId, sessionId, gameId, betCount, totalBet, currency },
    'american_roulette_spin_initiated'
  );

  const session = await getSession(sessionId);
  if (!session) {
    log.warn({ userId, sessionId, reason: 'session_not_found' }, 'american_roulette_spin_rejected');
    return { error: 'Session not found or expired', code: 403 };
  }
  if (session.user_id !== userId) {
    log.warn({ userId, sessionId, reason: 'forbidden' }, 'american_roulette_spin_rejected');
    return { error: 'Forbidden', code: 403 };
  }
  if (session.game_id !== gameId) {
    log.warn({ userId, sessionId, reason: 'invalid_game' }, 'american_roulette_spin_rejected');
    return { error: 'Invalid game for session', code: 400 };
  }

  const validation = validateAmericanRouletteBets(bets);
  if (!validation.valid) {
    log.warn(
      { userId, sessionId, reason: 'invalid_bets', detail: validation.error },
      'american_roulette_spin_rejected'
    );
    return { error: validation.error, code: 400 };
  }

  if (totalBet <= 0) {
    log.warn({ userId, sessionId, reason: 'zero_bet' }, 'american_roulette_spin_rejected');
    return { error: 'Total bet must be positive', code: 422 };
  }

  if (!AMERICAN_ROULETTE_CONFIG.currencies.includes(currency)) {
    log.warn(
      { userId, sessionId, currency, reason: 'invalid_currency' },
      'american_roulette_spin_rejected'
    );
    return { error: 'Invalid currency', code: 422 };
  }

  const requestFingerprint = americanRouletteFingerprint(sessionId, gameId, bets, currency);
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
       FROM idempotency_keys WHERE scoped_key = $1`,
      [scopedKey]
    );

    if (rows.length > 0) {
      const existing = rows[0];
      const createdAt = Number(existing.created_at);
      if (createdAt <= cutoff) {
        await getPool().query('DELETE FROM idempotency_keys WHERE scoped_key = $1', [scopedKey]);
      } else {
        if (existing.request_fingerprint !== requestFingerprint) {
          log.warn(
            { userId, sessionId, reason: 'idempotency_mismatch' },
            'american_roulette_spin_rejected'
          );
          return { error: 'Idempotency key reused with different request payload', code: 409 };
        }
        return { result: existing.response as AmericanRouletteSpinResult, code: 200 };
      }
    }
  }

  const wallet = await getOrCreateWallet(userId);
  const totalBetCents = Math.round(totalBet * 100);
  if (wallet.balance_cents < totalBetCents) {
    log.warn(
      {
        userId,
        sessionId,
        totalBetCents,
        balanceCents: wallet.balance_cents,
        reason: 'insufficient_balance',
      },
      'american_roulette_spin_rejected'
    );
    return { error: 'insufficient_balance', code: 422 };
  }

  const rate = await rateLimit(userId);
  if (rate.limited) {
    log.warn({ userId, sessionId, reason: 'rate_limited' }, 'american_roulette_spin_rejected');
    return { error: 'Too many requests', code: 429, retry_after_seconds: rate.retryAfterSeconds };
  }

  try {
    const seedPair = await getOrCreateActiveSeedPair(userId);
    const nonce = await incrementNonce(seedPair.id);
    const spinSeed = deriveSpinSeed(seedPair.server_seed, seedPair.client_seed, nonce);

    const balanceBeforeCents = wallet.balance_cents;
    const debitedWallet = await debitWallet(userId, totalBetCents, wallet.version);
    if (!debitedWallet) {
      log.warn(
        { userId, sessionId, totalBetCents, reason: 'debit_failed' },
        'american_roulette_spin_rejected'
      );
      return { error: 'insufficient_balance', code: 422 };
    }

    const outcome = runAmericanRouletteSpin(bets, currency, spinSeed);
    const winCents = Math.round(outcome.win.amount * 100);

    let finalWallet = debitedWallet;
    if (winCents > 0) {
      finalWallet = await creditWallet(userId, winCents);
    }

    const balanceAfterCents = finalWallet.balance_cents;
    const finishedAt = Date.now();

    const rouletteBets = outcome.win.breakdown.map((b) => ({
      bet_type: b.bet_type,
      numbers: b.numbers,
      amount_cents: Math.round(b.bet_amount * 100),
      payout_cents: Math.round(b.payout * 100),
      profit_cents: Math.round(b.profit * 100),
      la_partage: false,
      won: b.won,
    }));

    const round = await createRound({
      userId,
      sessionId,
      gameId,
      seedPairId: seedPair.id,
      nonce,
      betCents: totalBetCents,
      winCents,
      currency,
      lines: bets.length,
      balanceBeforeCents,
      balanceAfterCents,
      reelMatrix: {
        winning_number: outcome.winning_number,
        winning_number_display: outcome.winning_number_display,
        winning_color: outcome.winning_color,
        wheel_position: outcome.wheel_position,
      } as unknown as string[][],
      winBreakdown: outcome.win.breakdown,
      bonusTriggered: null,
      outcomeHash: null,
      balanceAfterBetCents: debitedWallet.balance_cents,
      rouletteBets,
      rouletteResult: {
        userId,
        winningNumber: outcome.winning_number,
        winningColor: outcome.winning_color,
      },
    });

    const durationMs = finishedAt - startedAt;
    log.info(
      {
        spinId: round.id,
        userId,
        sessionId,
        gameId,
        betCents: totalBetCents,
        winCents,
        balanceAfterCents,
        isWin: winCents > 0,
        betCount,
        winningNumber: outcome.winning_number,
        winningNumberDisplay: outcome.winning_number_display,
        winningColor: outcome.winning_color,
        wheelPosition: outcome.wheel_position,
        nonce,
        durationMs,
      },
      'american_roulette_spin_completed'
    );

    const result: AmericanRouletteSpinResult = {
      spin_id: round.id,
      session_id: sessionId,
      game_id: gameId,
      balance: { amount: balanceAfterCents / 100, currency },
      total_bet: totalBet,
      outcome,
      timestamp: finishedAt,
    };

    if (idempotencyKey) {
      const scopedKey = idempotencyKeyForUser(userId, idempotencyKey);
      await getPool().query(
        `INSERT INTO idempotency_keys (scoped_key, user_id, request_fingerprint, response, created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (scoped_key) DO NOTHING`,
        [scopedKey, userId, requestFingerprint, JSON.stringify(result), finishedAt]
      );
    }

    return { result, code: 200 };
  } catch (err) {
    log.error({ err, userId, sessionId, gameId, betCount }, 'american_roulette_spin_error');
    throw err;
  }
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
