import type { components, paths } from './generated/openapi';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api/v1').replace(/\/$/, '');

type InitRequestBody = components['schemas']['InitRequest'];
type SpinRequestBody = components['schemas']['SpinRequest'];
type ErrorResponse = components['schemas']['ErrorResponse'];

export type GameConfig = components['schemas']['GameConfig'];
export type GamePaytable = GameConfig['paytable'];
export type InitResponse =
  paths['/api/v1/game/init']['post']['responses'][200]['content']['application/json'];
export type SpinResponse =
  paths['/api/v1/spin']['post']['responses'][200]['content']['application/json'];

export async function initGame(token: string, gameId: string): Promise<InitResponse> {
  const body: InitRequestBody = {
    game_id: gameId,
    platform: 'web',
    locale: 'en',
    client_version: '1.0.0',
  };

  const res = await fetch(`${API_BASE}/game/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as InitResponse;
}

export async function spin(
  token: string,
  sessionId: string,
  gameId: string,
  bet: SpinRequestBody['bet'],
  idempotencyKey?: string
): Promise<SpinResponse> {
  const body: SpinRequestBody = {
    session_id: sessionId,
    game_id: gameId,
    bet,
    client_timestamp: Date.now(),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`${API_BASE}/spin`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Partial<ErrorResponse>;
    throw new Error(err.error ?? err.code ?? res.statusText);
  }
  return (await res.json()) as SpinResponse;
}
