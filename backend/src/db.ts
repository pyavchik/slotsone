import { Pool } from 'pg';
import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from './logger.js';

let pool: Pool | null = null;

/** Fixed advisory lock ID used to serialise migration runs across instances. */
const MIGRATION_LOCK_ID = 839_271;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  const p = getPool();

  // Acquire an advisory lock so only one process runs migrations at a time.
  await p.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

  try {
    // Bootstrap the migration ledger (idempotent).
    await p.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT        PRIMARY KEY,
        checksum   TEXT        NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Load what has already been applied.
    const { rows: applied } = await p.query<{ filename: string; checksum: string }>(
      'SELECT filename, checksum FROM schema_migrations ORDER BY filename'
    );
    const appliedMap = new Map(applied.map((r) => [r.filename, r.checksum]));

    // Discover migration files on disk.
    const dir = dirname(fileURLToPath(import.meta.url));
    const migrationsDir = join(dir, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      const checksum = createHash('sha256').update(sql).digest('hex');

      const existingChecksum = appliedMap.get(file);
      if (existingChecksum) {
        if (existingChecksum !== checksum) {
          throw new Error(
            `Migration ${file} was modified after being applied ` +
              `(ledger checksum ${existingChecksum.slice(0, 12)}…, ` +
              `file checksum ${checksum.slice(0, 12)}…). ` +
              'Create a new migration instead of editing an applied one.'
          );
        }
        continue; // Already applied — skip.
      }

      // Run inside a transaction so a failed migration doesn't leave partial state.
      const client = await p.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [
          file,
          checksum,
        ]);
        await client.query('COMMIT');
        appliedCount++;
        logger.info('migration_applied', { file });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    if (appliedCount > 0) {
      logger.info('migrations_complete', { applied: appliedCount, total: files.length });
    }
  } finally {
    await p.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
