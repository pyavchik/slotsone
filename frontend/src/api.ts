const API_BASE = '/api/v1';

export interface GameConfig {
  reels: number;
  rows: number;
  paylines: number;
  min_bet: number;
  max_bet: number;
  bet_levels: number[];
  currency: string;
}

export interface InitResponse {
  session_id: string;
  game_id: string;
  config: GameConfig & { currencies: string[]; rtp: number; volatility: string; features: string[] };
  balance: { amount: number; currency: string };
  expires_at: string;
}

export interface SpinResponse {
  spin_id: string;
  session_id: string;
  game_id: string;
  balance: { amount: number; currency: string };
  bet: { amount: number; currency: string };
  outcome: {
    reel_matrix: string[][];
    win: { amount: number; currency: string; breakdown: Array<{ type: string; line_index?: number; symbol: string; count: number; payout: number }> };
    bonus_triggered: { type: string; free_spins_count?: number; bonus_round_id?: string; multiplier?: number } | null;
  };
  next_state: string;
  timestamp: number;
}

export async function initGame(token: string, gameId: string): Promise<InitResponse> {
  const res = await fetch(`${API_BASE}/game/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ game_id: gameId, platform: 'web', locale: 'en', client_version: '1.0.0' }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function spin(
  token: string,
  sessionId: string,
  gameId: string,
  bet: { amount: number; currency: string; lines: number },
  idempotencyKey?: string
): Promise<SpinResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`${API_BASE}/spin`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session_id: sessionId,
      game_id: gameId,
      bet,
      client_timestamp: Date.now(),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? err?.code ?? res.statusText);
  }
  return res.json();
}
