import { Router, type Request, type Response, type NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  createSession,
  getConfig,
  executeSpin,
  getBalance,
  getHistory,
  getHistorySummary,
} from '../store.js';
import { GAME_ID } from '../engine/gameConfig.js';
import { buildIdleMatrix } from '../engine/spinEngine.js';
import {
  EnhancedHistoryQuerySchema,
  InitRequestSchema,
  SpinRequestSchema,
} from '../contracts/gameContract.js';
import { getRoundById, getRoundTransactions } from '../roundStore.js';
import { rotateSeedPair, setClientSeed, getOrCreateActiveSeedPair } from '../seedStore.js';

const router = Router();

/** Wrap async route handler so Express 4 forwards thrown errors to the error middleware. */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function toErrorCode(error: string): string {
  switch (error) {
    case 'insufficient_balance':
      return 'insufficient_balance';
    case 'Too many requests':
      return 'rate_limited';
    case 'Session not found or expired':
      return 'session_expired';
    case 'Forbidden':
      return 'forbidden';
    case 'Invalid game for session':
      return 'invalid_game_id';
    case 'Bet amount out of range':
      return 'invalid_bet';
    case 'Invalid currency':
      return 'invalid_currency';
    case 'Invalid lines count':
      return 'invalid_lines';
    case 'Idempotency key reused with different request payload':
      return 'idempotency_key_reused';
    default:
      return 'invalid_request';
  }
}

router.post(
  '/game/init',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { userId: string }).userId;
    const parsed = InitRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', code: 'invalid_body' });
      return;
    }
    const game_id = parsed.data.game_id ?? GAME_ID;
    const session = createSession(userId, game_id);
    const balance = await getBalance(userId, 'USD');
    res.json({
      session_id: session.session_id,
      game_id: session.game_id,
      config: getConfig(),
      balance: { amount: balance.amount, currency: balance.currency },
      idle_matrix: buildIdleMatrix(),
      expires_at: new Date(session.expires_at).toISOString(),
    });
  })
);

router.post(
  '/spin',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { userId: string }).userId;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const parsed = SpinRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', code: 'invalid_body' });
      return;
    }

    const session_id = parsed.data.session_id;
    const game_id = parsed.data.game_id;
    const betAmount = parsed.data.bet.amount;
    const lines = parsed.data.bet.lines;
    const currency = parsed.data.bet.currency;

    if (betAmount < 0) {
      res.status(400).json({ error: 'Invalid bet amount', code: 'invalid_bet' });
      return;
    }

    const result = await executeSpin(
      userId,
      session_id,
      game_id,
      betAmount,
      currency,
      lines,
      idempotencyKey
    );

    if ('error' in result) {
      if (result.code === 429 && typeof result.retry_after_seconds === 'number') {
        res.setHeader('Retry-After', String(result.retry_after_seconds));
      }
      res.status(result.code).json({
        error: result.error,
        code: toErrorCode(result.error),
      });
      return;
    }
    res.status(result.code).json(result.result);
  })
);

router.get(
  '/history',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { userId: string }).userId;
    const parsed = EnhancedHistoryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', code: 'invalid_query' });
      return;
    }

    const {
      limit,
      offset,
      date_from,
      date_to,
      result: resultFilter,
      min_bet,
      max_bet,
    } = parsed.data;
    const history = await getHistory(userId, limit ?? 50, offset ?? 0, {
      dateFrom: date_from,
      dateTo: date_to,
      result: resultFilter,
      minBet: min_bet,
      maxBet: max_bet,
    });

    const summary = await getHistorySummary(userId, {
      dateFrom: date_from,
      dateTo: date_to,
      result: resultFilter,
      minBet: min_bet,
      maxBet: max_bet,
    });

    res.json({ ...history, summary });
  })
);

router.get(
  '/history/summary',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { userId: string }).userId;
    const parsed = EnhancedHistoryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', code: 'invalid_query' });
      return;
    }

    const { date_from, date_to, result: resultFilter, min_bet, max_bet } = parsed.data;
    const summary = await getHistorySummary(userId, {
      dateFrom: date_from,
      dateTo: date_to,
      result: resultFilter,
      minBet: min_bet,
      maxBet: max_bet,
    });
    res.json(summary);
  })
);

router.get(
  '/history/:roundId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { userId: string }).userId;
    const { roundId } = req.params;

    // Validate UUID format to avoid PostgreSQL cast errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(roundId)) {
      res.status(404).json({ error: 'Round not found', code: 'not_found' });
      return;
    }

    const round = await getRoundById(roundId, userId);
    if (!round) {
      res.status(404).json({ error: 'Round not found', code: 'not_found' });
      return;
    }

    const transactions = await getRoundTransactions(roundId);

    // Include seed pair info if available
    let provablyFair = null;
    if (round.seed_pair_id) {
      const pool = (await import('../db.js')).getPool();
      const { rows } = await pool.query(
        `SELECT id, server_seed_hash, client_seed, nonce, active,
              CASE WHEN active = FALSE THEN server_seed ELSE NULL END AS server_seed,
              revealed_at
       FROM seed_pairs WHERE id = $1`,
        [round.seed_pair_id]
      );
      if (rows[0]) {
        provablyFair = {
          seed_pair_id: rows[0].id,
          server_seed_hash: rows[0].server_seed_hash,
          server_seed: rows[0].server_seed ?? null,
          client_seed: rows[0].client_seed,
          nonce: round.nonce,
          revealed: !rows[0].active,
        };
      }
    }

    res.json({
      round: {
        id: round.id,
        session_id: round.session_id,
        game_id: round.game_id,
        bet: round.bet_cents / 100,
        win: round.win_cents / 100,
        currency: round.currency,
        lines: round.lines,
        balance_before: round.balance_before_cents / 100,
        balance_after: round.balance_after_cents / 100,
        reel_matrix: round.reel_matrix,
        win_breakdown: round.win_breakdown,
        bonus_triggered: round.bonus_triggered,
        outcome_hash: round.outcome_hash,
        created_at: round.created_at,
      },
      provably_fair: provablyFair,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount_cents / 100,
        balance_after: t.balance_after_cents / 100,
        created_at: t.created_at,
      })),
    });
  })
);

router.post(
  '/provably-fair/rotate',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { userId: string }).userId;
    const { previous, current } = await rotateSeedPair(userId);

    res.json({
      previous: previous
        ? {
            seed_pair_id: previous.id,
            server_seed: previous.server_seed,
            server_seed_hash: previous.server_seed_hash,
            client_seed: previous.client_seed,
            nonce: previous.nonce,
          }
        : null,
      current: {
        seed_pair_id: current.id,
        server_seed_hash: current.server_seed_hash,
        client_seed: current.client_seed,
        nonce: current.nonce,
      },
    });
  })
);

router.put(
  '/provably-fair/client-seed',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { userId: string }).userId;
    const { client_seed } = req.body ?? {};
    if (!client_seed || typeof client_seed !== 'string' || client_seed.length > 64) {
      res.status(400).json({ error: 'Invalid client seed', code: 'invalid_body' });
      return;
    }

    const pair = await setClientSeed(userId, client_seed);
    if (!pair) {
      res.status(404).json({ error: 'No active seed pair', code: 'not_found' });
      return;
    }

    res.json({
      seed_pair_id: pair.id,
      server_seed_hash: pair.server_seed_hash,
      client_seed: pair.client_seed,
      nonce: pair.nonce,
    });
  })
);

router.get(
  '/provably-fair/current',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as unknown as { userId: string }).userId;
    const pair = await getOrCreateActiveSeedPair(userId);
    res.json({
      seed_pair_id: pair.id,
      server_seed_hash: pair.server_seed_hash,
      client_seed: pair.client_seed,
      nonce: pair.nonce,
      active: pair.active,
    });
  })
);

export default router;
