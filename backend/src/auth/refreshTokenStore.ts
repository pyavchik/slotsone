import { randomBytes } from 'crypto';

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface RefreshEntry {
  userId: string;
  expiresAt: number;
}

const store = new Map<string, RefreshEntry>();

export function createRefreshToken(userId: string): string {
  const token = randomBytes(32).toString('hex');
  store.set(token, { userId, expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS });
  return token;
}

/**
 * Validate and delete the token in one atomic step (rotation).
 * Always deletes — even if expired — so a stolen token can't be reused.
 * Returns the userId on success, null if invalid or expired.
 */
export function consumeRefreshToken(token: string): string | null {
  const entry = store.get(token);
  store.delete(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.userId;
}

/** Revoke all refresh tokens for a user (logout-all-devices). */
export function revokeAllRefreshTokensForUser(userId: string): void {
  for (const [token, entry] of store) {
    if (entry.userId === userId) store.delete(token);
  }
}

export function resetRefreshTokenStoreForTests(): void {
  store.clear();
}
