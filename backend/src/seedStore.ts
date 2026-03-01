import { getPool } from './db.js';
import { generateServerSeed, hashServerSeed } from './provablyFair.js';

export interface SeedPair {
  id: string;
  user_id: string;
  server_seed: string;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  active: boolean;
  revealed_at: string | null;
  created_at: string;
}

export async function createSeedPair(userId: string): Promise<SeedPair> {
  const pool = getPool();
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const { rows } = await pool.query<SeedPair>(
    `INSERT INTO seed_pairs (user_id, server_seed, server_seed_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, serverSeed, serverSeedHash]
  );
  return rows[0]!;
}

export async function getActiveSeedPair(userId: string): Promise<SeedPair | null> {
  const pool = getPool();
  const { rows } = await pool.query<SeedPair>(
    `SELECT * FROM seed_pairs WHERE user_id = $1 AND active = TRUE LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function getOrCreateActiveSeedPair(userId: string): Promise<SeedPair> {
  const existing = await getActiveSeedPair(userId);
  if (existing) return existing;
  return createSeedPair(userId);
}

export async function incrementNonce(seedPairId: string): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query<{ nonce: number }>(
    `UPDATE seed_pairs SET nonce = nonce + 1 WHERE id = $1 RETURNING nonce`,
    [seedPairId]
  );
  return rows[0]!.nonce;
}

export async function setClientSeed(userId: string, clientSeed: string): Promise<SeedPair | null> {
  const pool = getPool();
  const { rows } = await pool.query<SeedPair>(
    `UPDATE seed_pairs SET client_seed = $2
     WHERE user_id = $1 AND active = TRUE
     RETURNING *`,
    [userId, clientSeed]
  );
  return rows[0] ?? null;
}

/**
 * Rotate seed pair: deactivate old (revealing server_seed), create new.
 * Returns { previous, current }.
 */
export async function rotateSeedPair(
  userId: string
): Promise<{ previous: SeedPair | null; current: SeedPair }> {
  const pool = getPool();
  // Deactivate and reveal old seed
  const { rows: oldRows } = await pool.query<SeedPair>(
    `UPDATE seed_pairs
     SET active = FALSE, revealed_at = NOW()
     WHERE user_id = $1 AND active = TRUE
     RETURNING *`,
    [userId]
  );
  const previous = oldRows[0] ?? null;
  const current = await createSeedPair(userId);
  return { previous, current };
}
