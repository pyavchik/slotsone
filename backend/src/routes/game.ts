import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createSession, getConfig, executeSpin, getBalance, getHistory } from '../store.js';
import { GAME_ID } from '../engine/gameConfig.js';
import { HistoryQuerySchema, InitRequestSchema, SpinRequestSchema } from '../contracts/gameContract.js';

const router = Router();

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

router.post('/game/init', authMiddleware, (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const parsed = InitRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', code: 'invalid_body' });
    return;
  }
  const game_id = parsed.data.game_id ?? GAME_ID;
  const session = createSession(userId, game_id);
  const balance = getBalance(userId, 'USD');
  res.json({
    session_id: session.session_id,
    game_id: session.game_id,
    config: getConfig(),
    balance: { amount: balance.amount, currency: balance.currency },
    expires_at: new Date(session.expires_at).toISOString(),
  });
});

router.post('/spin', authMiddleware, (req, res) => {
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

  const result = executeSpin(userId, session_id, game_id, betAmount, currency, lines, idempotencyKey);

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
});

router.get('/history', authMiddleware, (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const parsed = HistoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', code: 'invalid_query' });
    return;
  }

  const limit = parsed.data.limit ?? 50;
  const offset = parsed.data.offset ?? 0;
  res.json(getHistory(userId, limit, offset));
});

export default router;
