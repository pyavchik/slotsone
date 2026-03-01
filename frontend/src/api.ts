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

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function initGame(token: string, gameId: string): Promise<InitResponse> {
  const body: InitRequestBody = {
    game_id: gameId,
    platform: 'web',
    locale: 'en',
    client_version: '1.0.0',
  };

  const res = await fetch(`${API_BASE}/game/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
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
    ...authHeaders(token),
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

// ---------------------------------------------------------------------------
// History API
// ---------------------------------------------------------------------------

export interface HistoryFilters {
  date_from?: string;
  date_to?: string;
  result?: 'win' | 'loss' | 'all';
  min_bet?: number;
  max_bet?: number;
  limit?: number;
  offset?: number;
}

export interface HistorySummary {
  total_rounds: number;
  total_wagered: number;
  total_won: number;
  net_result: number;
  biggest_win: number;
}

export interface HistoryItem {
  spin_id: string;
  session_id: string;
  game_id: string;
  balance: { amount: number; currency: string };
  bet: { amount: number; currency: string; lines: number };
  outcome: {
    reel_matrix: string[][];
    win: { amount: number; currency: string; breakdown: unknown[] };
    bonus_triggered: unknown | null;
  };
  next_state: string;
  timestamp: number;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  limit: number;
  offset: number;
  summary: HistorySummary;
}

export async function fetchHistory(
  token: string,
  filters: HistoryFilters = {}
): Promise<HistoryResponse> {
  const params = new URLSearchParams();
  if (filters.limit != null) params.set('limit', String(filters.limit));
  if (filters.offset != null) params.set('offset', String(filters.offset));
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.result && filters.result !== 'all') params.set('result', filters.result);
  if (filters.min_bet != null) params.set('min_bet', String(filters.min_bet));
  if (filters.max_bet != null) params.set('max_bet', String(filters.max_bet));

  const qs = params.toString();
  const res = await fetch(`${API_BASE}/history${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new ApiError(await res.text(), res.status);
  return (await res.json()) as HistoryResponse;
}

export interface RoundTransaction {
  id: string;
  type: 'bet' | 'win';
  amount: number;
  balance_after: number;
  created_at: string;
}

export interface ProvablyFairData {
  seed_pair_id: string;
  server_seed_hash: string;
  server_seed: string | null;
  client_seed: string;
  nonce: number | null;
  revealed: boolean;
}

export interface RoundDetail {
  id: string;
  session_id: string;
  game_id: string;
  bet: number;
  win: number;
  currency: string;
  lines: number;
  balance_before: number;
  balance_after: number;
  reel_matrix: string[][];
  win_breakdown: unknown[];
  bonus_triggered: unknown | null;
  outcome_hash: string | null;
  created_at: string;
}

export interface RoundDetailResponse {
  round: RoundDetail;
  provably_fair: ProvablyFairData | null;
  transactions: RoundTransaction[];
}

export async function fetchRoundDetail(
  token: string,
  roundId: string
): Promise<RoundDetailResponse> {
  const res = await fetch(`${API_BASE}/history/${encodeURIComponent(roundId)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Partial<ErrorResponse>;
    throw new ApiError(err.error ?? res.statusText, res.status);
  }
  return (await res.json()) as RoundDetailResponse;
}

export interface SeedPairInfo {
  seed_pair_id: string;
  server_seed_hash: string;
  server_seed?: string;
  client_seed: string;
  nonce: number;
}

export interface SeedRotationResult {
  previous: (SeedPairInfo & { server_seed: string }) | null;
  current: SeedPairInfo;
}

export async function rotateSeedPair(token: string): Promise<SeedRotationResult> {
  const res = await fetch(`${API_BASE}/provably-fair/rotate`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new ApiError(await res.text(), res.status);
  return (await res.json()) as SeedRotationResult;
}

export async function setClientSeed(token: string, clientSeed: string): Promise<SeedPairInfo> {
  const res = await fetch(`${API_BASE}/provably-fair/client-seed`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ client_seed: clientSeed }),
  });
  if (!res.ok) throw new ApiError(await res.text(), res.status);
  return (await res.json()) as SeedPairInfo;
}
