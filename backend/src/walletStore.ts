import { getPool } from './db.js';

export interface Wallet {
  id: string;
  user_id: string;
  balance_cents: number;
  version: number;
}

export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  const pool = getPool();
  // Upsert: create if not exists, return existing if present
  const { rows } = await pool.query<Wallet>(
    `INSERT INTO wallets (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
     RETURNING id, user_id, balance_cents, version`,
    [userId]
  );
  return rows[0]!;
}

/**
 * Debit wallet with optimistic locking.
 * Returns the updated wallet or null if version mismatch or insufficient balance.
 */
export async function debitWallet(
  userId: string,
  amountCents: number,
  expectedVersion: number
): Promise<Wallet | null> {
  const pool = getPool();
  const { rows } = await pool.query<Wallet>(
    `UPDATE wallets
     SET balance_cents = balance_cents - $2,
         version = version + 1,
         updated_at = NOW()
     WHERE user_id = $1
       AND version = $3
       AND balance_cents >= $2
     RETURNING id, user_id, balance_cents, version`,
    [userId, amountCents, expectedVersion]
  );
  return rows[0] ?? null;
}

/**
 * Credit wallet (no version check needed — always additive).
 */
export async function creditWallet(userId: string, amountCents: number): Promise<Wallet> {
  const pool = getPool();
  const { rows } = await pool.query<Wallet>(
    `UPDATE wallets
     SET balance_cents = balance_cents + $2,
         version = version + 1,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING id, user_id, balance_cents, version`,
    [userId, amountCents]
  );
  return rows[0]!;
}
