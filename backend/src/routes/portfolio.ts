import { Router } from 'express';
import type { Request, Response } from 'express';
import { getLatest2FACode } from '../atlassian2faStore.js';

const router = Router();

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request): boolean {
  const ip = req.ip ?? 'unknown';
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS_PER_WINDOW) return false;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(ip);
  }
}, WINDOW_MS).unref();

router.get('/portfolio/atlassian-2fa', (req: Request, res: Response): void => {
  if (!rateLimit(req)) {
    res.status(429).json({ error: 'Too many requests', code: 'rate_limited' });
    return;
  }

  res.set('Cache-Control', 'no-store');

  const latest = getLatest2FACode();
  if (!latest) {
    res.json({ code: null, receivedAt: null, ageSeconds: null });
    return;
  }

  res.json({
    code: latest.code,
    receivedAt: new Date(latest.receivedAt).toISOString(),
    ageSeconds: Math.round((Date.now() - latest.receivedAt) / 1000),
  });
});

export default router;
