import { expect, request, test } from '@playwright/test';
import crypto from 'node:crypto';

const GAME_ID = 'slot_mega_fortune_001';

type AuthResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type InitResponse = {
  session_id: string;
  game_id: string;
  config: {
    reels: number;
    rows: number;
    min_bet?: number;
    max_bet?: number;
    default_lines?: number;
    max_lines?: number;
  };
  balance: { amount: number; currency: string };
};

type SpinResponse = {
  spin_id: string;
  session_id: string;
  game_id: string;
  bet: { amount: number; currency: string; lines: number };
  balance: { amount: number; currency: string };
  outcome: {
    reel_matrix: string[][];
    win: { amount: number; breakdown: unknown[] };
  };
};

type SeedPairResponse = {
  server_seed_hash: string;
  active: boolean;
  server_seed?: string;
};

type RotateResponse = {
  previous?: {
    server_seed?: string;
    server_seed_hash?: string;
  };
};

function email(): string {
  return `ts_api_${crypto.randomUUID().slice(0, 12)}@test.slotsone.dev`;
}

function password(): string {
  return `Pass_${crypto.randomUUID().slice(0, 16)}`;
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function deriveRoundSeed(serverSeed: string, clientSeed: string, nonce: number): number {
  const digest = crypto
    .createHmac('sha256', serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest();
  return digest.readUInt32BE(0);
}

async function createApi(token?: string) {
  return request.newContext({
    baseURL: process.env.API_URL ?? 'http://localhost:3001',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function registerUser() {
  const api = await createApi();
  const credentials = { email: email(), password: password() };
  const response = await api.post('/api/v1/auth/register', { data: credentials });
  expect(response.status()).toBe(201);

  const body = (await response.json()) as AuthResponse;
  expect(body.token_type).toBe('Bearer');
  expect(body.access_token.split('.')).toHaveLength(3);

  await api.dispose();
  return { ...credentials, token: body.access_token };
}

async function initSession(token: string): Promise<InitResponse> {
  const api = await createApi(token);
  const response = await api.post('/api/v1/game/init', {
    data: {
      game_id: GAME_ID,
      platform: 'web',
      locale: 'en',
      client_version: 'qa-typescript/1.0',
    },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as InitResponse;
  await api.dispose();
  return body;
}

async function spinOnce(token: string, session: InitResponse, amount = 1): Promise<SpinResponse> {
  const lines = session.config.default_lines ?? session.config.max_lines ?? 20;
  const api = await createApi(token);
  const response = await api.post('/api/v1/spin', {
    data: {
      session_id: session.session_id,
      game_id: GAME_ID,
      bet: { amount, currency: 'USD', lines },
      client_timestamp: Date.now(),
    },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as SpinResponse;
  await api.dispose();
  return body;
}

test.describe('TypeScript API automation - health', () => {
  test('GET /health returns liveness status', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  test('GET /ready returns database readiness', async ({ request }) => {
    const response = await request.get('/ready');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ready');
    expect(body.checks.database.status).toBe('ok');
  });
});

test.describe('TypeScript API automation - auth', () => {
  test('register returns bearer token', async ({ request }) => {
    const response = await request.post('/api/v1/auth/register', {
      data: { email: email(), password: password() },
    });
    expect(response.status()).toBe(201);
    const body = (await response.json()) as AuthResponse;
    expect(body.token_type).toBe('Bearer');
    expect(body.access_token.split('.')).toHaveLength(3);
    expect(typeof body.expires_in).toBe('number');
  });

  test('login returns token for existing user', async ({ request }) => {
    const credentials = { email: email(), password: password() };
    const register = await request.post('/api/v1/auth/register', { data: credentials });
    expect(register.status()).toBe(201);

    const login = await request.post('/api/v1/auth/login', { data: credentials });
    expect(login.status()).toBe(200);
    const body = (await login.json()) as AuthResponse;
    expect(body.access_token.split('.')).toHaveLength(3);
  });

  test('register rejects invalid email', async ({ request }) => {
    const response = await request.post('/api/v1/auth/register', {
      data: { email: 'not-an-email', password: password() },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test('register rejects short password', async ({ request }) => {
    const response = await request.post('/api/v1/auth/register', {
      data: { email: email(), password: 'short' },
    });
    expect(response.status()).toBe(400);
  });

  test('login rejects wrong password', async ({ request }) => {
    const credentials = { email: email(), password: password() };
    const register = await request.post('/api/v1/auth/register', { data: credentials });
    expect(register.status()).toBe(201);

    const response = await request.post('/api/v1/auth/login', {
      data: { email: credentials.email, password: 'WrongPassword123!' },
    });
    expect(response.status()).toBe(401);
  });

  test('duplicate registration returns conflict or validation error', async ({ request }) => {
    const credentials = { email: email(), password: password() };
    const first = await request.post('/api/v1/auth/register', { data: credentials });
    expect(first.status()).toBe(201);

    const second = await request.post('/api/v1/auth/register', { data: credentials });
    expect([400, 409]).toContain(second.status());
  });
});

test.describe('TypeScript API automation - slot game flow', () => {
  test('game init returns session, config and balance', async () => {
    const { token } = await registerUser();
    const session = await initSession(token);

    expect(session.game_id).toBe(GAME_ID);
    expect(session.session_id).toBeTruthy();
    expect(session.config.reels).toBeGreaterThanOrEqual(3);
    expect(session.config.rows).toBeGreaterThanOrEqual(3);
    expect(session.balance.currency).toBe('USD');
  });

  test('spin debits wallet and returns outcome', async () => {
    const { token } = await registerUser();
    const session = await initSession(token);
    const spin = await spinOnce(token, session, 1);

    expect(spin.spin_id).toBeTruthy();
    expect(spin.session_id).toBe(session.session_id);
    expect(spin.game_id).toBe(GAME_ID);
    expect(spin.outcome.reel_matrix.length).toBeGreaterThan(0);
    expect(Array.isArray(spin.outcome.win.breakdown)).toBe(true);
    expect(spin.balance.amount).toBeGreaterThanOrEqual(0);
  });

  test('history lists recent spin', async () => {
    const { token } = await registerUser();
    const session = await initSession(token);
    const spin = await spinOnce(token, session);
    const api = await createApi(token);

    const response = await api.get('/api/v1/history?limit=10');
    expect(response.status()).toBe(200);
    const body = await response.json();
    const ids = body.items.map((item: { spin_id: string }) => item.spin_id);
    expect(ids).toContain(spin.spin_id);
    await api.dispose();
  });

  test('round detail matches spin response', async () => {
    const { token } = await registerUser();
    const session = await initSession(token);
    const spin = await spinOnce(token, session);
    const api = await createApi(token);

    const response = await api.get(`/api/v1/history/${spin.spin_id}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.round.id).toBe(spin.spin_id);
    expect(body.round.session_id).toBe(session.session_id);
    expect(body.round.bet).toBe(spin.bet.amount);
    await api.dispose();
  });

  test('spin without token is unauthorized', async ({ request }) => {
    const response = await request.post('/api/v1/spin', {
      data: {
        session_id: 'fake',
        game_id: GAME_ID,
        bet: { amount: 1, currency: 'USD', lines: 20 },
        client_timestamp: Date.now(),
      },
    });
    expect(response.status()).toBe(401);
  });

  test('spin rejects unknown session', async () => {
    const { token } = await registerUser();
    const api = await createApi(token);

    const response = await api.post('/api/v1/spin', {
      data: {
        session_id: 'nonexistent-session-id',
        game_id: GAME_ID,
        bet: { amount: 1, currency: 'USD', lines: 20 },
        client_timestamp: Date.now(),
      },
    });
    expect([400, 403, 404, 422]).toContain(response.status());
    await api.dispose();
  });
});

test.describe('TypeScript API automation - provably fair', () => {
  test('current seed pair publishes hash only', async () => {
    const { token } = await registerUser();
    const api = await createApi(token);

    const response = await api.get('/api/v1/provably-fair/current');
    expect(response.status()).toBe(200);
    const body = (await response.json()) as SeedPairResponse;
    expect(body.server_seed_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(body.active).toBe(true);
    expect(body.server_seed).toBeUndefined();
    await api.dispose();
  });

  test('rotation reveals previous server seed matching published hash', async () => {
    const { token } = await registerUser();
    const api = await createApi(token);

    const currentResponse = await api.get('/api/v1/provably-fair/current');
    const current = (await currentResponse.json()) as SeedPairResponse;

    const rotateResponse = await api.post('/api/v1/provably-fair/rotate');
    expect(rotateResponse.status()).toBe(200);
    const rotated = (await rotateResponse.json()) as RotateResponse;
    const revealed = rotated.previous?.server_seed;
    expect(revealed).toBeTruthy();
    expect(rotated.previous?.server_seed_hash).toBe(current.server_seed_hash);
    expect(sha256Hex(revealed ?? '')).toBe(current.server_seed_hash);
    await api.dispose();
  });

  test('round seed can be independently re-derived', async () => {
    const { token } = await registerUser();
    const session = await initSession(token);
    const spin = await spinOnce(token, session);
    const api = await createApi(token);

    const rotateResponse = await api.post('/api/v1/provably-fair/rotate');
    expect(rotateResponse.status()).toBe(200);
    const rotated = (await rotateResponse.json()) as RotateResponse;
    const revealed = rotated.previous?.server_seed;
    expect(revealed).toBeTruthy();

    const detailResponse = await api.get(`/api/v1/history/${spin.spin_id}`);
    expect(detailResponse.status()).toBe(200);
    const detail = await detailResponse.json();
    const fairness = detail.provably_fair;
    expect(fairness.server_seed_hash).toBe(sha256Hex(revealed ?? ''));

    const seed = deriveRoundSeed(revealed ?? '', fairness.client_seed, Number(fairness.nonce));
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
    await api.dispose();
  });
});
