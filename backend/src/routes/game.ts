import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createSession, getConfig, executeSpin, getBalance } from '../store.js';
import { GAME_ID } from '../engine/gameConfig.js';

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
    case 'Idempotency key reused with different request payload':
      return 'idempotency_key_reused';
    default:
      return 'invalid_request';
  }
}

router.post('/game/init', authMiddleware, (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const body = req.body as { game_id?: string; platform?: string; locale?: string; client_version?: string };
  const game_id = body?.game_id ?? GAME_ID;
  if (!game_id) {
    res.status(400).json({ error: 'Invalid request', code: 'invalid_game_id' });
    return;
  }
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
  const body = req.body as {
    session_id?: string;
    game_id?: string;
    bet?: { amount?: number; currency?: string; lines?: number };
    client_timestamp?: number;
  };
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  const session_id = body?.session_id;
  const game_id = body?.game_id ?? GAME_ID;
  const betAmount = Number(body?.bet?.amount);
  const currency = body?.bet?.currency ?? 'USD';

  if (!session_id || typeof betAmount !== 'number' || !Number.isFinite(betAmount)) {
    res.status(400).json({ error: 'Invalid request', code: 'invalid_body' });
    return;
  }
  if (betAmount < 0) {
    res.status(400).json({ error: 'Invalid bet amount', code: 'invalid_bet' });
    return;
  }

  const result = executeSpin(userId, session_id, game_id, betAmount, currency, idempotencyKey);

  if ('error' in result) {
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
  // Demo: return empty history (could store spins and filter by userId)
  res.json({ items: [], total: 0, limit: 50, offset: 0 });
});

export default router;
