import type { components, paths } from './generated/openapi';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api/v1').replace(/\/$/, '');
const AUTH_BASE = `${API_BASE}/auth`;

type InitRequestBody = components['schemas']['InitRequest'];
type SpinRequestBody = components['schemas']['SpinRequest'];
type ErrorResponse = components['schemas']['ErrorResponse'];

export type GameConfig = components['schemas']['GameConfig'];
export type GamePaytable = GameConfig['paytable'];
export type InitResponse =
  paths['/api/v1/game/init']['post']['responses'][200]['content']['application/json'];
export type SpinResponse =
  paths['/api/v1/spin']['post']['responses'][200]['content']['application/json'];

// ---------------------------------------------------------------------------
// Typed error — carries HTTP status so callers can branch on 401 etc.
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Auth — credentials:'include' so the browser sends/receives the httpOnly
// refresh_token cookie automatically. The access token is never stored in JS.
// ---------------------------------------------------------------------------

interface AuthResult {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

async function authPost(path: string, body?: Record<string, string>): Promise<AuthResult> {
  const res = await fetch(`${AUTH_BASE}/${path}`, {
    method: 'POST',
    credentials: 'include', // send + receive httpOnly cookies
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(err.error ?? res.statusText, res.status);
  }
  return (await res.json()) as AuthResult;
}

export async function register(email: string, password: string): Promise<AuthResult> {
  return authPost('register', { email, password });
}

export async function login(email: string, password: string): Promise<AuthResult> {
  return authPost('login', { email, password });
}

/**
 * Exchange the httpOnly refresh cookie for a fresh access token.
 * The server rotates the cookie on every call (single-use).
 * Throws ApiError(401) if the cookie is missing or expired.
 */
export async function refreshAccessToken(): Promise<AuthResult> {
  return authPost('refresh');
}

/**
 * Revoke all refresh tokens for the user and clear the cookie.
 * Safe to call even when already logged out.
 */
export async function logout(): Promise<void> {
  await fetch(`${AUTH_BASE}/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

// ---------------------------------------------------------------------------
// Game API — access token in Authorization header, no cookies needed
// ---------------------------------------------------------------------------

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
  if (!res.ok) throw new ApiError(await res.text(), res.status);
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
    throw new ApiError(err.error ?? err.code ?? res.statusText, res.status);
  }
  return (await res.json()) as SpinResponse;
}
