import { Router, type NextFunction, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createRouletteSession, executeRouletteSpin, getBalance } from '../store.js';
import { ROULETTE_CONFIG, ROULETTE_GAME_ID } from '../engine/rouletteConfig.js';
import { RouletteSpinRequestSchema } from '../contracts/rouletteContract.js';
import { getRecentResults } from '../rouletteStore.js';
import { getLogger, setUserId, setSessionId } from '../logger.js';

const router = Router();

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
    case 'Total bet exceeds limit':
      return 'invalid_bet';
    case 'Invalid currency':
      return 'invalid_currency';
    case 'Idempotency key reused with different request payload':
      return 'idempotency_key_reused';
    default:
      return 'invalid_request';
  }
}

router.post(
  '/roulette/init',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as Request & { userId: string }).userId;
    setUserId(userId);
    const log = getLogger();

    const [session, balance, recent] = await Promise.all([
      createRouletteSession(userId),
      getBalance(userId, 'USD'),
      getRecentResults(userId, 20),
    ]);

    log.info(
      { userId, sessionId: session.session_id, gameId: ROULETTE_GAME_ID },
      'roulette_session_created'
    );

    res.json({
      session_id: session.session_id,
      game_id: ROULETTE_GAME_ID,
      config: ROULETTE_CONFIG,
      balance: { amount: balance.amount, currency: balance.currency },
      recent_numbers: recent.map((r) => r.number),
      expires_at: new Date(session.expires_at).toISOString(),
    });
  })
);

router.post(
  '/roulette/spin',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as Request & { userId: string }).userId;
    setUserId(userId);
    const log = getLogger();

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const parsed = RouletteSpinRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', code: 'invalid_body' });
      return;
    }

    const { session_id, game_id = ROULETTE_GAME_ID, bets } = parsed.data;
    setSessionId(session_id);

    const result = await executeRouletteSpin(
      userId,
      session_id,
      game_id,
      bets,
      'USD',
      idempotencyKey
    );

    if ('error' in result) {
      log.warn(
        {
          userId,
          sessionId: session_id,
          errorCode: toErrorCode(result.error),
          betCount: bets.length,
        },
        'roulette_spin_rejected'
      );
      if (result.code === 429 && typeof result.retry_after_seconds === 'number') {
        res.setHeader('Retry-After', String(result.retry_after_seconds));
      }
      res.status(result.code).json({ error: result.error, code: toErrorCode(result.error) });
      return;
    }

    res.status(200).json(result.result);
  })
);

export const rouletteRoutes = router;
