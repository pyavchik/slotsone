import { getPool } from './db.js';

export interface GameRound {
  id: string;
  user_id: string;
  session_id: string;
  game_id: string;
  seed_pair_id: string | null;
  nonce: number | null;
  bet_cents: number;
  win_cents: number;
  currency: string;
  lines: number;
  balance_before_cents: number;
  balance_after_cents: number;
  reel_matrix: string[][];
  win_breakdown: unknown[];
  bonus_triggered: unknown | null;
  outcome_hash: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  round_id: string;
  user_id: string;
  type: 'bet' | 'win';
  amount_cents: number;
  balance_after_cents: number;
  created_at: string;
}

export interface CreateRoundParams {
  userId: string;
  sessionId: string;
  gameId: string;
  seedPairId: string | null;
  nonce: number | null;
  betCents: number;
  winCents: number;
  currency: string;
  lines: number;
  balanceBeforeCents: number;
  balanceAfterCents: number;
  reelMatrix: string[][];
  winBreakdown: unknown[];
  bonusTriggered: unknown | null;
  outcomeHash: string | null;
  // balance after bet (before win credit) for the bet transaction
  balanceAfterBetCents: number;
}

export async function createRound(params: CreateRoundParams): Promise<GameRound> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<GameRound>(
      `INSERT INTO game_rounds
        (user_id, session_id, game_id, seed_pair_id, nonce,
         bet_cents, win_cents, currency, lines,
         balance_before_cents, balance_after_cents,
         reel_matrix, win_breakdown, bonus_triggered, outcome_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        params.userId,
        params.sessionId,
        params.gameId,
        params.seedPairId,
        params.nonce,
        params.betCents,
        params.winCents,
        params.currency,
        params.lines,
        params.balanceBeforeCents,
        params.balanceAfterCents,
        JSON.stringify(params.reelMatrix),
        JSON.stringify(params.winBreakdown),
        params.bonusTriggered ? JSON.stringify(params.bonusTriggered) : null,
        params.outcomeHash,
      ]
    );
    const round = rows[0]!;

    // Bet transaction (debit)
    await client.query(
      `INSERT INTO transactions (round_id, user_id, type, amount_cents, balance_after_cents)
       VALUES ($1, $2, 'bet', $3, $4)`,
      [round.id, params.userId, params.betCents, params.balanceAfterBetCents]
    );

    // Win transaction (credit) — only if win > 0
    if (params.winCents > 0) {
      await client.query(
        `INSERT INTO transactions (round_id, user_id, type, amount_cents, balance_after_cents)
         VALUES ($1, $2, 'win', $3, $4)`,
        [round.id, params.userId, params.winCents, params.balanceAfterCents]
      );
    }

    await client.query('COMMIT');
    return round;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface HistoryFilters {
  dateFrom?: string;
  dateTo?: string;
  result?: 'win' | 'loss' | 'all';
  minBet?: number;
  maxBet?: number;
  limit?: number;
  offset?: number;
}

export async function getUserRounds(
  userId: string,
  filters: HistoryFilters = {}
): Promise<{ items: GameRound[]; total: number; limit: number; offset: number }> {
  const pool = getPool();
  const conditions = ['user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (filters.dateFrom) {
    conditions.push(`created_at >= $${paramIdx}`);
    params.push(filters.dateFrom);
    paramIdx++;
  }
  if (filters.dateTo) {
    conditions.push(`created_at <= $${paramIdx}`);
    params.push(filters.dateTo);
    paramIdx++;
  }
  if (filters.result === 'win') {
    conditions.push('win_cents > bet_cents');
  } else if (filters.result === 'loss') {
    conditions.push('win_cents <= bet_cents');
  }
  if (filters.minBet != null) {
    conditions.push(`bet_cents >= $${paramIdx}`);
    params.push(Math.round(filters.minBet * 100));
    paramIdx++;
  }
  if (filters.maxBet != null) {
    conditions.push(`bet_cents <= $${paramIdx}`);
    params.push(Math.round(filters.maxBet * 100));
    paramIdx++;
  }

  const where = conditions.join(' AND ');
  const limit = Math.max(1, Math.min(100, filters.limit ?? 50));
  const offset = Math.max(0, filters.offset ?? 0);

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM game_rounds WHERE ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]!.count, 10);

  const dataParams = [...params, limit, offset];
  const { rows } = await pool.query<GameRound>(
    `SELECT * FROM game_rounds WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    dataParams
  );

  return { items: rows, total, limit, offset };
}

export async function getRoundById(roundId: string, userId: string): Promise<GameRound | null> {
  const pool = getPool();
  const { rows } = await pool.query<GameRound>(
    `SELECT * FROM game_rounds WHERE id = $1 AND user_id = $2`,
    [roundId, userId]
  );
  return rows[0] ?? null;
}

export async function getRoundTransactions(roundId: string): Promise<Transaction[]> {
  const pool = getPool();
  const { rows } = await pool.query<Transaction>(
    `SELECT * FROM transactions WHERE round_id = $1 ORDER BY created_at ASC`,
    [roundId]
  );
  return rows;
}

export interface UserSummary {
  total_rounds: number;
  total_wagered: number;
  total_won: number;
  net_result: number;
  biggest_win: number;
}

export async function getUserSummary(
  userId: string,
  filters: HistoryFilters = {}
): Promise<UserSummary> {
  const pool = getPool();
  const conditions = ['user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (filters.dateFrom) {
    conditions.push(`created_at >= $${paramIdx}`);
    params.push(filters.dateFrom);
    paramIdx++;
  }
  if (filters.dateTo) {
    conditions.push(`created_at <= $${paramIdx}`);
    params.push(filters.dateTo);
    paramIdx++;
  }
  if (filters.result === 'win') {
    conditions.push('win_cents > bet_cents');
  } else if (filters.result === 'loss') {
    conditions.push('win_cents <= bet_cents');
  }
  if (filters.minBet != null) {
    conditions.push(`bet_cents >= $${paramIdx}`);
    params.push(Math.round(filters.minBet * 100));
    paramIdx++;
  }
  if (filters.maxBet != null) {
    conditions.push(`bet_cents <= $${paramIdx}`);
    params.push(Math.round(filters.maxBet * 100));
    paramIdx++;
  }

  const where = conditions.join(' AND ');
  const { rows } = await pool.query<{
    total_rounds: string;
    total_wagered: string;
    total_won: string;
    biggest_win: string;
  }>(
    `SELECT
       COUNT(*)::text AS total_rounds,
       COALESCE(SUM(bet_cents), 0)::text AS total_wagered,
       COALESCE(SUM(win_cents), 0)::text AS total_won,
       COALESCE(MAX(win_cents), 0)::text AS biggest_win
     FROM game_rounds WHERE ${where}`,
    params
  );

  const row = rows[0]!;
  const totalWagered = parseInt(row.total_wagered, 10);
  const totalWon = parseInt(row.total_won, 10);

  return {
    total_rounds: parseInt(row.total_rounds, 10),
    total_wagered: totalWagered / 100,
    total_won: totalWon / 100,
    net_result: (totalWon - totalWagered) / 100,
    biggest_win: parseInt(row.biggest_win, 10) / 100,
  };
}
