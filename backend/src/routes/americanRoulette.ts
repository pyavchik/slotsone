import { Router, type NextFunction, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  createAmericanRouletteSession,
  executeAmericanRouletteSpin,
  getBalance,
} from '../store.js';
import {
  AMERICAN_ROULETTE_CONFIG,
  AMERICAN_ROULETTE_GAME_ID,
} from '../engine/americanRouletteConfig.js';
import { AmericanRouletteSpinRequestSchema } from '../contracts/americanRouletteContract.js';
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
  '/american-roulette/init',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as Request & { userId: string }).userId;
    setUserId(userId);
    const log = getLogger();

    const [session, balance, recent] = await Promise.all([
      createAmericanRouletteSession(userId),
      getBalance(userId, 'USD'),
      getRecentResults(userId, 20),
    ]);

    log.info(
      { userId, sessionId: session.session_id, gameId: AMERICAN_ROULETTE_GAME_ID },
      'american_roulette_session_created'
    );

    res.json({
      session_id: session.session_id,
      game_id: AMERICAN_ROULETTE_GAME_ID,
      config: AMERICAN_ROULETTE_CONFIG,
      balance: { amount: balance.amount, currency: balance.currency },
      recent_numbers: recent.map((r) => r.number),
      expires_at: new Date(session.expires_at).toISOString(),
    });
  })
);

router.post(
  '/american-roulette/spin',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = (req as Request & { userId: string }).userId;
    setUserId(userId);
    const log = getLogger();

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const parsed = AmericanRouletteSpinRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', code: 'invalid_body' });
      return;
    }

    const { session_id, game_id = AMERICAN_ROULETTE_GAME_ID, bets } = parsed.data;
    setSessionId(session_id);

    const result = await executeAmericanRouletteSpin(
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
        'american_roulette_spin_rejected'
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

export const americanRouletteRoutes = router;
