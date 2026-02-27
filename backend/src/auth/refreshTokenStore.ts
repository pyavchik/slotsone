import { randomBytes } from 'crypto';
import { getPool } from '../db.js';

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await getPool().query(
    "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, NOW() + interval '7 days')",
    [token, userId]
  );
  return token;
}

/**
 * Validate and delete the token in one atomic step (rotation).
 * Always deletes — even if expired — so a stolen token can't be reused.
 * Returns the userId on success, null if invalid or expired.
 */
export async function consumeRefreshToken(token: string): Promise<string | null> {
  const result = await getPool().query<{ user_id: string; expires_at: Date }>(
    'DELETE FROM refresh_tokens WHERE token = $1 RETURNING user_id, expires_at',
    [token]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  if (new Date() > row.expires_at) return null;
  return row.user_id;
}

/** Revoke all refresh tokens for a user (logout-all-devices). */
export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  await getPool().query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

export async function resetRefreshTokenStoreForTests(): Promise<void> {
  await getPool().query('TRUNCATE TABLE refresh_tokens');
}
