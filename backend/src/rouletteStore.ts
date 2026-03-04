import { getPool } from './db.js';
import type { PoolClient } from 'pg';
import type { RouletteBetType } from './engine/rouletteConfig.js';

export interface ResolvedRouletteBetRow {
  id: string;
  bet_type: RouletteBetType;
  numbers: number[];
  amount_cents: number;
  payout_cents: number;
  profit_cents: number;
  la_partage: boolean;
  won: boolean;
  created_at: string;
}

export interface ResolvedRouletteBetInput {
  bet_type: RouletteBetType;
  numbers: number[];
  amount_cents: number;
  payout_cents: number;
  profit_cents: number;
  la_partage: boolean;
  won: boolean;
}

export async function insertRouletteBets(
  client: PoolClient,
  roundId: string,
  bets: ResolvedRouletteBetInput[]
): Promise<void> {
  if (!bets.length) return;
  for (const bet of bets) {
    await client.query(
      `INSERT INTO roulette_bets (round_id, bet_type, numbers, amount_cents, payout_cents, profit_cents, la_partage, won)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        roundId,
        bet.bet_type,
        bet.numbers,
        bet.amount_cents,
        bet.payout_cents,
        bet.profit_cents,
        bet.la_partage,
        bet.won,
      ]
    );
  }
}

export async function getRouletteBets(roundId: string): Promise<ResolvedRouletteBetRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<ResolvedRouletteBetRow>(
    `SELECT id, bet_type, numbers, amount_cents, payout_cents, profit_cents, la_partage, won, created_at
     FROM roulette_bets WHERE round_id = $1 ORDER BY created_at ASC`,
    [roundId]
  );
  return rows;
}

export async function insertRouletteResult(
  client: PoolClient,
  roundId: string,
  userId: string,
  winningNumber: number,
  winningColor: string
): Promise<void> {
  await client.query(
    `INSERT INTO roulette_results (round_id, user_id, winning_number, winning_color)
     VALUES ($1,$2,$3,$4)`,
    [roundId, userId, winningNumber, winningColor]
  );
}

export async function getRecentResults(
  userId: string,
  limit = 20
): Promise<{ number: number; color: string }[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ winning_number: number; winning_color: string }>(
    `SELECT winning_number, winning_color FROM roulette_results
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows.map((r) => ({ number: r.winning_number, color: r.winning_color }));
}
