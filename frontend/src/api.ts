import type { components, paths } from './generated/openapi';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api/v1').replace(/\/$/, '');
const AUTH_BASE = `${API_BASE}/auth`;

// ---------------------------------------------------------------------------
// Internal request/error types — used only inside this module
// ---------------------------------------------------------------------------

type InitRequestBody = components['schemas']['InitRequest'];
type SpinRequestBody = components['schemas']['SpinRequest'];
type ErrorResponse = components['schemas']['ErrorResponse'];

// ---------------------------------------------------------------------------
// Re-exported type aliases — replace hand-maintained duplicates with generated
// ---------------------------------------------------------------------------

export type GameConfig = components['schemas']['GameConfig'];
export type GamePaytable = GameConfig['paytable'];
export type InitResponse =
  paths['/api/v1/game/init']['post']['responses'][200]['content']['application/json'];
export type SpinResponse =
  paths['/api/v1/spin']['post']['responses'][200]['content']['application/json'];

export type AuthResult = components['schemas']['AuthResponse'];

export type HistoryFilters = NonNullable<paths['/api/v1/history']['get']['parameters']['query']>;

export type HistorySummary = components['schemas']['HistorySummary'];
export type HistoryItem = components['schemas']['SpinResponse'];
export type HistoryResponse = components['schemas']['EnhancedHistoryResponse'];

export type RoundTransaction = components['schemas']['Transaction'];
export type ProvablyFairData = components['schemas']['ProvablyFair'];
export type RoundDetail = components['schemas']['RoundDetail'];
export type RoundDetailResponse = components['schemas']['RoundDetailResponse'];

export type SeedPairInfo = components['schemas']['SeedPairResponse'];
export type SeedRotationResult = components['schemas']['SeedRotationResponse'];

type ThumbnailRequest = components['schemas']['ImageGenerateRequest'];
type ThumbnailResponse = components['schemas']['ImageJobResponse'];

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

export async function rotateSeedPair(token: string): Promise<SeedRotationResult> {
  const res = await fetch(`${API_BASE}/provably-fair/rotate`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new ApiError(await res.text(), res.status);
  return (await res.json()) as SeedRotationResult;
}

// ---------------------------------------------------------------------------
// Image generation API
// ---------------------------------------------------------------------------

export async function generateThumbnail(
  token: string,
  req: ThumbnailRequest
): Promise<ThumbnailResponse> {
  const res = await fetch(`${API_BASE}/images/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new ApiError(await res.text(), res.status);
  return (await res.json()) as ThumbnailResponse;
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
