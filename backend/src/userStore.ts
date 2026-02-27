import { getPool } from './db.js';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export async function createUser(email: string, passwordHash: string): Promise<User> {
  const key = email.toLowerCase();
  try {
    const result = await getPool().query<{ id: string; email: string; password_hash: string }>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, password_hash',
      [key, passwordHash]
    );
    const row = result.rows[0];
    return { id: row.id, email: row.email, passwordHash: row.password_hash };
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      throw new Error('email_taken');
    }
    throw err;
  }
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const result = await getPool().query<{ id: string; email: string; password_hash: string }>(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (result.rows.length === 0) return undefined;
  const row = result.rows[0];
  return { id: row.id, email: row.email, passwordHash: row.password_hash };
}

export async function resetUserStoreForTests(): Promise<void> {
  await getPool().query('TRUNCATE TABLE users CASCADE');
}
