/**
 * SlotsOne API Integration Test Suite
 *
 * Comprehensive automated tests for auth, slots, European roulette,
 * American roulette, history, provably fair, and negative/security paths.
 *
 * Run:   npm test
 * Smoke: npm run test:smoke
 *
 * Requires a running backend at API_URL (default http://localhost:3001).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.API_URL ?? 'http://localhost:3001';

const SLOTS_GAME_ID = 'slot_mega_fortune_001';
const EUROPEAN_ROULETTE_GAME_ID = 'roulette_european_001';
const AMERICAN_ROULETTE_GAME_ID = 'roulette_american_001';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ApiResponse<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
  elapsed: number;
}

async function apiRequest<T = unknown>(
  method: string,
  path: string,
  opts: {
    body?: unknown;
    token?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const hdrs: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts.headers,
  };
  if (opts.token) {
    hdrs['Authorization'] = `Bearer ${opts.token}`;
  }

  const start = performance.now();
  const res = await fetch(url, {
    method,
    headers: hdrs,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const elapsed = performance.now() - start;

  let body: T;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = (await res.json()) as T;
  } else {
    body = (await res.text()) as unknown as T;
  }

  return { status: res.status, headers: res.headers, body, elapsed };
}

function randomEmail(): string {
  const id = crypto.randomUUID().slice(0, 12);
  return `qa_${id}@test.slotsone.dev`;
}

function randomPassword(): string {
  return `Pass_${crypto.randomUUID().slice(0, 16)}`;
}

async function registerAndLogin(): Promise<{ token: string; email: string; password: string }> {
  const email = randomEmail();
  const password = randomPassword();
  const res = await apiRequest<{ access_token: string }>('POST', '/api/v1/auth/register', {
    body: { email, password },
  });
  assert.equal(res.status, 201, `Registration failed: ${JSON.stringify(res.body)}`);
  return { token: res.body.access_token, email, password };
}

function assertResponseTime(elapsed: number, maxMs = 500): void {
  assert.ok(elapsed < maxMs, `Response took ${Math.round(elapsed)}ms, expected < ${maxMs}ms`);
}

// ---------------------------------------------------------------------------
// 1. Health Checks (smoke)
// ---------------------------------------------------------------------------

describe('Health Checks (smoke)', () => {
  it('GET /health should return 200 with status ok', async () => {
    const res = await apiRequest('GET', '/health');
    assert.equal(res.status, 200);
    assert.deepStrictEqual(res.body, { status: 'ok' });
    assertResponseTime(res.elapsed);
  });

  it('GET /ready should return 200 with database check', async () => {
    const res = await apiRequest<{ status: string; checks: Record<string, { status: string }> }>(
      'GET',
      '/ready',
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ready');
    assert.ok(res.body.checks.database, 'Missing database check');
    assert.equal(res.body.checks.database.status, 'ok');
    assertResponseTime(res.elapsed, 1000);
  });
});

// ---------------------------------------------------------------------------
// 2. Auth Flow
// ---------------------------------------------------------------------------

describe('Auth Flow', () => {
  const email = randomEmail();
  const password = 'SecurePass123!';

  it('should register with valid credentials and return 201', async () => {
    const res = await apiRequest<{ access_token: string; token_type: string; expires_in: number }>(
      'POST',
      '/api/v1/auth/register',
      { body: { email, password } },
    );
    assert.equal(res.status, 201, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.access_token, 'Missing access_token');
    assert.equal(res.body.token_type, 'Bearer');
    assert.equal(typeof res.body.expires_in, 'number');
    assertResponseTime(res.elapsed);
  });

  it('should return 409 when registering duplicate email', async () => {
    const res = await apiRequest('POST', '/api/v1/auth/register', {
      body: { email, password },
    });
    assert.equal(res.status, 409);
  });

  it('should return 400 when registering with invalid email', async () => {
    const res = await apiRequest('POST', '/api/v1/auth/register', {
      body: { email: 'not-an-email', password },
    });
    assert.equal(res.status, 400);
  });

  it('should return 400 when registering with short password', async () => {
    const res = await apiRequest('POST', '/api/v1/auth/register', {
      body: { email: randomEmail(), password: 'short' },
    });
    assert.equal(res.status, 400);
  });

  it('should login with valid credentials and return 200', async () => {
    const res = await apiRequest<{ access_token: string; token_type: string; expires_in: number }>(
      'POST',
      '/api/v1/auth/login',
      { body: { email, password } },
    );
    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.access_token, 'Missing access_token');
    assert.equal(res.body.token_type, 'Bearer');
    assertResponseTime(res.elapsed);
  });

  it('should return 401 when logging in with wrong password', async () => {
    const res = await apiRequest('POST', '/api/v1/auth/login', {
      body: { email, password: 'WrongPassword123' },
    });
    assert.equal(res.status, 401);
  });

  it('should return 401 when accessing protected endpoint without token', async () => {
    const res = await apiRequest('POST', '/api/v1/game/init', {
      body: {},
    });
    assert.equal(res.status, 401);
  });
});

// ---------------------------------------------------------------------------
// 3. Slots Game Flow
// ---------------------------------------------------------------------------

describe('Slots Game Flow', () => {
  let token: string;
  let sessionId: string;
  let initialBalance: number;

  before(async () => {
    const auth = await registerAndLogin();
    token = auth.token;
  });

  it('should init game and return 200 with session_id, config, balance', async () => {
    const res = await apiRequest<{
      session_id: string;
      game_id: string;
      config: { reels: number; rows: number; paylines: number; currencies: string[] };
      balance: { amount: number; currency: string };
      idle_matrix: string[][];
      expires_at: string;
    }>('POST', '/api/v1/game/init', {
      token,
      body: { game_id: SLOTS_GAME_ID },
    });
    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.session_id, 'Missing session_id');
    assert.equal(res.body.game_id, SLOTS_GAME_ID);
    assert.ok(res.body.config, 'Missing config');
    assert.equal(res.body.config.reels, 5);
    assert.equal(res.body.config.rows, 3);
    assert.equal(res.body.config.paylines, 20);
    assert.ok(res.body.balance, 'Missing balance');
    assert.equal(typeof res.body.balance.amount, 'number');
    assert.ok(res.body.idle_matrix, 'Missing idle_matrix');
    assert.ok(res.body.expires_at, 'Missing expires_at');
    assertResponseTime(res.elapsed);

    sessionId = res.body.session_id;
    initialBalance = res.body.balance.amount;
  });

  it('should spin with valid bet and return 200 with outcome', async () => {
    const betAmount = 1;
    const res = await apiRequest<{
      spin_id: string;
      session_id: string;
      game_id: string;
      balance: { amount: number; currency: string };
      bet: { amount: number; currency: string; lines: number };
      outcome: { reel_matrix: string[][]; win: { amount: number; breakdown: unknown[] } };
      timestamp: number;
    }>('POST', '/api/v1/spin', {
      token,
      body: {
        session_id: sessionId,
        game_id: SLOTS_GAME_ID,
        bet: { amount: betAmount, currency: 'USD', lines: 20 },
        client_timestamp: Date.now(),
      },
    });
    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.spin_id, 'Missing spin_id');
    assert.equal(res.body.session_id, sessionId);
    assert.equal(res.body.game_id, SLOTS_GAME_ID);
    assert.ok(res.body.outcome, 'Missing outcome');
    assert.ok(res.body.outcome.reel_matrix, 'Missing reel_matrix');
    assert.ok(Array.isArray(res.body.outcome.win.breakdown), 'Missing win breakdown');
    assert.equal(typeof res.body.balance.amount, 'number');
    assertResponseTime(res.elapsed);

    // Verify balance updated: newBalance = initial - bet + win
    const winAmount = res.body.outcome.win.amount;
    const expectedBalance = initialBalance - betAmount + winAmount;
    assert.equal(
      res.body.balance.amount,
      expectedBalance,
      `Balance mismatch: expected ${expectedBalance}, got ${res.body.balance.amount}`,
    );
  });

  it('should return 422 when bet exceeds balance', async () => {
    const res = await apiRequest('POST', '/api/v1/spin', {
      token,
      body: {
        session_id: sessionId,
        game_id: SLOTS_GAME_ID,
        bet: { amount: 999999, currency: 'USD', lines: 20 },
        client_timestamp: Date.now(),
      },
    });
    assert.equal(res.status, 422, `Expected 422, got ${res.status}: ${JSON.stringify(res.body)}`);
  });

  it('should return 400 or 422 when spinning with invalid currency', async () => {
    const res = await apiRequest('POST', '/api/v1/spin', {
      token,
      body: {
        session_id: sessionId,
        game_id: SLOTS_GAME_ID,
        bet: { amount: 1, currency: 'FAKE', lines: 20 },
        client_timestamp: Date.now(),
      },
    });
    assert.ok(
      [400, 422].includes(res.status),
      `Expected 400 or 422, got ${res.status}: ${JSON.stringify(res.body)}`,
    );
  });

  it('should return 403 when spinning with expired/invalid session ID', async () => {
    const res = await apiRequest('POST', '/api/v1/spin', {
      token,
      body: {
        session_id: crypto.randomUUID(),
        game_id: SLOTS_GAME_ID,
        bet: { amount: 1, currency: 'USD', lines: 20 },
        client_timestamp: Date.now(),
      },
    });
    assert.equal(res.status, 403, `Expected 403, got ${res.status}: ${JSON.stringify(res.body)}`);
  });

  it('should return same response for idempotent request (same key + same payload)', async () => {
    const idempotencyKey = crypto.randomUUID();
    const payload = {
      session_id: sessionId,
      game_id: SLOTS_GAME_ID,
      bet: { amount: 1, currency: 'USD', lines: 20 },
      client_timestamp: Date.now(),
    };

    const res1 = await apiRequest<{ spin_id: string }>('POST', '/api/v1/spin', {
      token,
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    assert.equal(res1.status, 200, `First spin failed: ${JSON.stringify(res1.body)}`);

    const res2 = await apiRequest<{ spin_id: string }>('POST', '/api/v1/spin', {
      token,
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    assert.equal(res2.status, 200, `Second spin failed: ${JSON.stringify(res2.body)}`);
    assert.equal(res1.body.spin_id, res2.body.spin_id, 'Idempotent responses should match');
  });

  it('should return 409 for idempotent request with same key but different payload', async () => {
    const idempotencyKey = crypto.randomUUID();
    const payload1 = {
      session_id: sessionId,
      game_id: SLOTS_GAME_ID,
      bet: { amount: 1, currency: 'USD', lines: 20 },
      client_timestamp: Date.now(),
    };

    const res1 = await apiRequest('POST', '/api/v1/spin', {
      token,
      body: payload1,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    assert.equal(res1.status, 200, `First spin failed: ${JSON.stringify(res1.body)}`);

    const payload2 = {
      ...payload1,
      bet: { amount: 2, currency: 'USD', lines: 20 },
    };
    const res2 = await apiRequest('POST', '/api/v1/spin', {
      token,
      body: payload2,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    assert.equal(res2.status, 409, `Expected 409, got ${res2.status}: ${JSON.stringify(res2.body)}`);
  });

  it('should return 429 after exceeding rate limit (6 rapid spins)', async () => {
    // Create a fresh session to avoid stale state
    const initRes = await apiRequest<{ session_id: string }>('POST', '/api/v1/game/init', {
      token,
      body: { game_id: SLOTS_GAME_ID },
    });
    const freshSessionId = initRes.body.session_id;

    let rateLimited = false;
    for (let i = 0; i < 8; i++) {
      const res = await apiRequest('POST', '/api/v1/spin', {
        token,
        body: {
          session_id: freshSessionId,
          game_id: SLOTS_GAME_ID,
          bet: { amount: 0.1, currency: 'USD', lines: 1 },
          client_timestamp: Date.now(),
        },
      });
      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert.ok(rateLimited, 'Expected to be rate limited after rapid spins');
  });
});

// ---------------------------------------------------------------------------
// 4. European Roulette Flow
// ---------------------------------------------------------------------------

describe('European Roulette Flow', () => {
  let token: string;
  let sessionId: string;

  before(async () => {
    const auth = await registerAndLogin();
    token = auth.token;
  });

  it('should init European roulette and return 200 with session_id, config (37 numbers)', async () => {
    const res = await apiRequest<{
      session_id: string;
      game_id: string;
      config: { type: string; variant: string; numbers: number; features: string[] };
      balance: { amount: number; currency: string };
      recent_numbers: number[];
      expires_at: string;
    }>('POST', '/api/v1/roulette/init', { token, body: {} });

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.session_id, 'Missing session_id');
    assert.equal(res.body.game_id, EUROPEAN_ROULETTE_GAME_ID);
    assert.equal(res.body.config.type, 'roulette');
    assert.equal(res.body.config.variant, 'european');
    assert.equal(res.body.config.numbers, 37);
    assert.ok(res.body.config.features.includes('la_partage'), 'Should include la_partage feature');
    assert.ok(res.body.balance, 'Missing balance');
    assert.ok(Array.isArray(res.body.recent_numbers), 'Missing recent_numbers');
    assertResponseTime(res.elapsed);

    sessionId = res.body.session_id;
  });

  it('should spin with a straight bet and return 200 with outcome', async () => {
    const res = await apiRequest<{
      spin_id: string;
      outcome: {
        winning_number: number;
        winning_color: string;
        win: { amount: number; breakdown: unknown[] };
        total_bet: number;
        total_return: number;
      };
      balance: { amount: number };
    }>('POST', '/api/v1/roulette/spin', {
      token,
      body: {
        session_id: sessionId,
        game_id: EUROPEAN_ROULETTE_GAME_ID,
        bets: [{ type: 'straight', numbers: [17], amount: 1 }],
        client_timestamp: Date.now(),
      },
    });

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.spin_id, 'Missing spin_id');
    assert.ok(res.body.outcome, 'Missing outcome');
    assert.ok(
      res.body.outcome.winning_number >= 0 && res.body.outcome.winning_number <= 36,
      `Invalid winning_number: ${res.body.outcome.winning_number}`,
    );
    assert.ok(
      ['red', 'black', 'green'].includes(res.body.outcome.winning_color),
      `Invalid winning_color: ${res.body.outcome.winning_color}`,
    );
    assert.equal(res.body.outcome.total_bet, 1);
    assertResponseTime(res.elapsed);
  });

  it('should accept multiple bet types in a single spin', async () => {
    const res = await apiRequest<{ spin_id: string; outcome: { total_bet: number } }>(
      'POST',
      '/api/v1/roulette/spin',
      {
        token,
        body: {
          session_id: sessionId,
          game_id: EUROPEAN_ROULETTE_GAME_ID,
          bets: [
            { type: 'straight', numbers: [7], amount: 1 },
            { type: 'red', numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36], amount: 5 },
            { type: 'split', numbers: [1, 4], amount: 2 },
          ],
          client_timestamp: Date.now(),
        },
      },
    );

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.spin_id);
    assert.equal(res.body.outcome.total_bet, 8);
  });

  it('should return 400 for invalid bet type', async () => {
    const res = await apiRequest('POST', '/api/v1/roulette/spin', {
      token,
      body: {
        session_id: sessionId,
        game_id: EUROPEAN_ROULETTE_GAME_ID,
        bets: [{ type: 'nonexistent_bet', numbers: [1], amount: 1 }],
        client_timestamp: Date.now(),
      },
    });
    assert.equal(res.status, 400, `Expected 400, got ${res.status}: ${JSON.stringify(res.body)}`);
  });

  it('should return 400 or 422 for split bet with non-adjacent numbers', async () => {
    const res = await apiRequest('POST', '/api/v1/roulette/spin', {
      token,
      body: {
        session_id: sessionId,
        game_id: EUROPEAN_ROULETTE_GAME_ID,
        bets: [{ type: 'split', numbers: [1, 36], amount: 1 }],
        client_timestamp: Date.now(),
      },
    });
    assert.ok(
      [400, 422].includes(res.status),
      `Expected 400 or 422, got ${res.status}: ${JSON.stringify(res.body)}`,
    );
  });

  it('should verify La Partage: even-money bets on European roulette include la_partage field', async () => {
    // We cannot control the wheel outcome, but we can verify the response shape
    // includes la_partage boolean in each bet result
    const res = await apiRequest<{
      outcome: { win: { breakdown: Array<{ la_partage: boolean }> } };
    }>('POST', '/api/v1/roulette/spin', {
      token,
      body: {
        session_id: sessionId,
        game_id: EUROPEAN_ROULETTE_GAME_ID,
        bets: [
          { type: 'red', numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36], amount: 1 },
        ],
        client_timestamp: Date.now(),
      },
    });
    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.outcome.win.breakdown.length > 0, 'Missing breakdown');
    // Each bet result should have a la_partage boolean field
    for (const bet of res.body.outcome.win.breakdown) {
      assert.equal(typeof bet.la_partage, 'boolean', 'la_partage field should be boolean');
    }
  });
});

// ---------------------------------------------------------------------------
// 5. American Roulette Flow
// ---------------------------------------------------------------------------

describe('American Roulette Flow', () => {
  let token: string;
  let sessionId: string;

  before(async () => {
    const auth = await registerAndLogin();
    token = auth.token;
  });

  it('should init American roulette and return 200 with session_id, config (38 numbers, includes 00)', async () => {
    const res = await apiRequest<{
      session_id: string;
      game_id: string;
      config: {
        type: string;
        variant: string;
        numbers: number;
        double_zero: number;
        features: string[];
      };
      balance: { amount: number; currency: string };
      recent_numbers: number[];
      expires_at: string;
    }>('POST', '/api/v1/american-roulette/init', { token, body: {} });

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.session_id, 'Missing session_id');
    assert.equal(res.body.game_id, AMERICAN_ROULETTE_GAME_ID);
    assert.equal(res.body.config.type, 'roulette');
    assert.equal(res.body.config.variant, 'american');
    assert.equal(res.body.config.numbers, 38);
    assert.equal(res.body.config.double_zero, -1, 'double_zero should be -1');
    assert.ok(res.body.config.features.includes('top_line'), 'Should include top_line feature');
    assertResponseTime(res.elapsed);

    sessionId = res.body.session_id;
  });

  it('should spin with a straight bet and return 200', async () => {
    const res = await apiRequest<{
      spin_id: string;
      outcome: {
        winning_number: number;
        winning_number_display: string;
        winning_color: string;
      };
    }>('POST', '/api/v1/american-roulette/spin', {
      token,
      body: {
        session_id: sessionId,
        game_id: AMERICAN_ROULETTE_GAME_ID,
        bets: [{ type: 'straight', numbers: [7], amount: 1 }],
        client_timestamp: Date.now(),
      },
    });

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.spin_id);
    assert.ok(res.body.outcome.winning_number_display !== undefined, 'Missing winning_number_display field');
    assert.ok(
      ['red', 'black', 'green'].includes(res.body.outcome.winning_color),
      `Invalid color: ${res.body.outcome.winning_color}`,
    );
    assertResponseTime(res.elapsed);
  });

  it('should accept topLine bet [0, -1, 1, 2, 3] and return 200', async () => {
    const res = await apiRequest<{ spin_id: string; outcome: { total_bet: number } }>(
      'POST',
      '/api/v1/american-roulette/spin',
      {
        token,
        body: {
          session_id: sessionId,
          game_id: AMERICAN_ROULETTE_GAME_ID,
          bets: [{ type: 'topLine', numbers: [0, -1, 1, 2, 3], amount: 5 }],
          client_timestamp: Date.now(),
        },
      },
    );

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.outcome.total_bet, 5);
  });

  it('should not have La Partage on American variant (no la_partage field in breakdown)', async () => {
    const res = await apiRequest<{
      outcome: { win: { breakdown: Array<Record<string, unknown>> } };
    }>('POST', '/api/v1/american-roulette/spin', {
      token,
      body: {
        session_id: sessionId,
        game_id: AMERICAN_ROULETTE_GAME_ID,
        bets: [
          { type: 'red', numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36], amount: 1 },
        ],
        client_timestamp: Date.now(),
      },
    });

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    // American roulette bet results should NOT have la_partage field
    for (const bet of res.body.outcome.win.breakdown) {
      assert.ok(
        !('la_partage' in bet) || bet.la_partage === undefined,
        'American roulette should not have la_partage in breakdown',
      );
    }
  });

  it('should include winning_number_display field in outcome', async () => {
    const res = await apiRequest<{
      outcome: { winning_number: number; winning_number_display: string };
    }>('POST', '/api/v1/american-roulette/spin', {
      token,
      body: {
        session_id: sessionId,
        game_id: AMERICAN_ROULETTE_GAME_ID,
        bets: [{ type: 'straight', numbers: [0], amount: 1 }],
        client_timestamp: Date.now(),
      },
    });

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.equal(typeof res.body.outcome.winning_number_display, 'string');
    // If winning_number is -1, display should be "00"
    if (res.body.outcome.winning_number === -1) {
      assert.equal(res.body.outcome.winning_number_display, '00');
    }
  });
});

// ---------------------------------------------------------------------------
// 6. History & Provably Fair
// ---------------------------------------------------------------------------

describe('History & Provably Fair', () => {
  let token: string;
  let spinIds: string[] = [];

  before(async () => {
    const auth = await registerAndLogin();
    token = auth.token;

    // Create some spin history
    const initRes = await apiRequest<{ session_id: string }>('POST', '/api/v1/game/init', {
      token,
      body: { game_id: SLOTS_GAME_ID },
    });
    const sessionId = initRes.body.session_id;

    for (let i = 0; i < 3; i++) {
      const spinRes = await apiRequest<{ spin_id: string }>('POST', '/api/v1/spin', {
        token,
        body: {
          session_id: sessionId,
          game_id: SLOTS_GAME_ID,
          bet: { amount: 0.1, currency: 'USD', lines: 1 },
          client_timestamp: Date.now(),
        },
      });
      if (spinRes.status === 200) {
        spinIds.push(spinRes.body.spin_id);
      }
      // Small delay to avoid rate limit
      await new Promise((r) => setTimeout(r, 250));
    }
  });

  it('should fetch history after spins and return recent rounds', async () => {
    const res = await apiRequest<{
      items: Array<{ spin_id: string }>;
      total: number;
      limit: number;
      offset: number;
      summary: { total_rounds: number; total_wagered: number };
    }>('GET', '/api/v1/history?limit=50&offset=0', { token });

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(Array.isArray(res.body.items), 'Missing items array');
    assert.ok(res.body.total >= spinIds.length, `Expected at least ${spinIds.length} rounds`);
    assert.ok(res.body.summary, 'Missing summary');
    assert.ok(res.body.summary.total_rounds >= spinIds.length);
    assertResponseTime(res.elapsed);
  });

  it('should filter history by date range', async () => {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600_000);
    const res = await apiRequest<{ items: unknown[]; total: number }>(
      'GET',
      `/api/v1/history?date_from=${hourAgo.toISOString()}&date_to=${now.toISOString()}`,
      { token },
    );

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(Array.isArray(res.body.items));
  });

  it('should filter history by result (win/loss)', async () => {
    const resWin = await apiRequest<{ items: unknown[]; total: number }>(
      'GET',
      '/api/v1/history?result=win',
      { token },
    );
    assert.equal(resWin.status, 200);
    assert.ok(Array.isArray(resWin.body.items));

    const resLoss = await apiRequest<{ items: unknown[]; total: number }>(
      'GET',
      '/api/v1/history?result=loss',
      { token },
    );
    assert.equal(resLoss.status, 200);
    assert.ok(Array.isArray(resLoss.body.items));
  });

  it('should fetch round detail by spin_id and return 200', async () => {
    assert.ok(spinIds.length > 0, 'No spin IDs available for round detail test');

    const res = await apiRequest<{
      round: {
        id: string;
        game_id: string;
        bet: number;
        win: number;
        currency: string;
        reel_matrix: unknown;
        balance_before: number;
        balance_after: number;
      };
      provably_fair: { server_seed_hash: string; client_seed: string; nonce: number } | null;
      transactions: Array<{ id: string; type: string; amount: number }>;
    }>('GET', `/api/v1/history/${spinIds[0]}`, { token });

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.round, 'Missing round');
    assert.equal(res.body.round.id, spinIds[0]);
    assert.equal(res.body.round.game_id, SLOTS_GAME_ID);
    assert.equal(typeof res.body.round.bet, 'number');
    assert.equal(typeof res.body.round.win, 'number');
    assert.ok(res.body.transactions, 'Missing transactions');
    assert.ok(Array.isArray(res.body.transactions));
    assertResponseTime(res.elapsed);
  });

  it('should return 404 for non-existent round', async () => {
    const fakeId = crypto.randomUUID();
    const res = await apiRequest('GET', `/api/v1/history/${fakeId}`, { token });
    assert.equal(res.status, 404, `Expected 404, got ${res.status}: ${JSON.stringify(res.body)}`);
  });

  it('should get current seed pair and return 200 with server_seed_hash', async () => {
    const res = await apiRequest<{
      seed_pair_id: string;
      server_seed_hash: string;
      client_seed: string;
      nonce: number;
      active: boolean;
    }>('GET', '/api/v1/provably-fair/current', { token });

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.seed_pair_id, 'Missing seed_pair_id');
    assert.ok(res.body.server_seed_hash, 'Missing server_seed_hash');
    assert.ok(res.body.client_seed, 'Missing client_seed');
    assert.equal(typeof res.body.nonce, 'number');
    assertResponseTime(res.elapsed);
  });

  it('should set client seed and return 200', async () => {
    const newSeed = `qa_test_seed_${crypto.randomUUID().slice(0, 8)}`;
    const res = await apiRequest<{
      seed_pair_id: string;
      server_seed_hash: string;
      client_seed: string;
    }>('PUT', '/api/v1/provably-fair/client-seed', {
      token,
      body: { client_seed: newSeed },
    });

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.client_seed, newSeed);
    assertResponseTime(res.elapsed);
  });

  it('should rotate seed pair, reveal previous server_seed, and verify SHA256 hash', async () => {
    // Get current hash before rotation
    const currentRes = await apiRequest<{
      seed_pair_id: string;
      server_seed_hash: string;
    }>('GET', '/api/v1/provably-fair/current', { token });
    const hashBeforeRotation = currentRes.body.server_seed_hash;

    // Rotate
    const res = await apiRequest<{
      previous: {
        seed_pair_id: string;
        server_seed: string;
        server_seed_hash: string;
        client_seed: string;
        nonce: number;
      } | null;
      current: {
        seed_pair_id: string;
        server_seed_hash: string;
        client_seed: string;
        nonce: number;
      };
    }>('POST', '/api/v1/provably-fair/rotate', { token });

    assert.equal(res.status, 200, `Body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.current, 'Missing current seed pair');
    assert.ok(res.body.current.server_seed_hash, 'Missing new server_seed_hash');

    if (res.body.previous) {
      assert.ok(res.body.previous.server_seed, 'Previous should reveal server_seed');
      assert.equal(
        res.body.previous.server_seed_hash,
        hashBeforeRotation,
        'Previous hash should match what was shown before rotation',
      );

      // Verify: SHA256(revealed_server_seed) === previously_shown_hash
      const computedHash = crypto
        .createHash('sha256')
        .update(res.body.previous.server_seed)
        .digest('hex');
      assert.equal(
        computedHash,
        res.body.previous.server_seed_hash,
        `SHA256 verification failed: computed ${computedHash} !== stored ${res.body.previous.server_seed_hash}`,
      );
    }
    assertResponseTime(res.elapsed);
  });
});

// ---------------------------------------------------------------------------
// 7. Negative Tests
// ---------------------------------------------------------------------------

describe('Negative Tests', () => {
  let token: string;

  before(async () => {
    const auth = await registerAndLogin();
    token = auth.token;
  });

  it('should return 401 for all protected endpoints without auth', async () => {
    const protectedPaths: Array<{ method: string; path: string; body?: unknown }> = [
      { method: 'POST', path: '/api/v1/game/init', body: {} },
      { method: 'POST', path: '/api/v1/spin', body: { session_id: 'x', game_id: 'x', bet: { amount: 1, currency: 'USD', lines: 1 }, client_timestamp: 0 } },
      { method: 'GET', path: '/api/v1/history' },
      { method: 'GET', path: '/api/v1/history/summary' },
      { method: 'GET', path: `/api/v1/history/${crypto.randomUUID()}` },
      { method: 'GET', path: '/api/v1/provably-fair/current' },
      { method: 'POST', path: '/api/v1/provably-fair/rotate' },
      { method: 'PUT', path: '/api/v1/provably-fair/client-seed', body: { client_seed: 'test' } },
      { method: 'POST', path: '/api/v1/roulette/init', body: {} },
      { method: 'POST', path: '/api/v1/roulette/spin', body: { session_id: 'x', bets: [] } },
      { method: 'POST', path: '/api/v1/american-roulette/init', body: {} },
      { method: 'POST', path: '/api/v1/american-roulette/spin', body: { session_id: 'x', bets: [] } },
    ];

    for (const { method, path, body } of protectedPaths) {
      const res = await apiRequest(method, path, { body });
      assert.equal(
        res.status,
        401,
        `${method} ${path}: expected 401, got ${res.status}: ${JSON.stringify(res.body)}`,
      );
    }
  });

  it('should return 400 for invalid JSON body', async () => {
    const url = `${BASE_URL}/api/v1/auth/register`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json }}}',
    });
    assert.equal(res.status, 400, `Expected 400 for malformed JSON, got ${res.status}`);
  });

  it('should return 400 for missing required fields on register', async () => {
    const res = await apiRequest('POST', '/api/v1/auth/register', {
      body: { email: randomEmail() },
      // missing password
    });
    assert.equal(res.status, 400);
  });

  it('should return 400 for missing required fields on spin', async () => {
    const res = await apiRequest('POST', '/api/v1/spin', {
      token,
      body: { session_id: 'test' },
      // missing game_id, bet, client_timestamp
    });
    assert.equal(res.status, 400);
  });

  it('should handle XSS attempt in string fields safely', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    const res = await apiRequest('POST', '/api/v1/auth/register', {
      body: { email: xssPayload, password: 'ValidPass123' },
    });
    // Should reject invalid email format, not execute script
    assert.equal(res.status, 400, `XSS email should be rejected: ${JSON.stringify(res.body)}`);

    // Try XSS in client_seed
    const seedRes = await apiRequest('PUT', '/api/v1/provably-fair/client-seed', {
      token,
      body: { client_seed: xssPayload },
    });
    // Should either accept it safely (stored as plain text) or reject
    assert.ok(
      [200, 400].includes(seedRes.status),
      `Unexpected status for XSS client_seed: ${seedRes.status}`,
    );
    if (seedRes.status === 200) {
      // Verify it was stored as plain text, not interpreted
      const currentRes = await apiRequest<{ client_seed: string }>(
        'GET',
        '/api/v1/provably-fair/current',
        { token },
      );
      assert.equal(currentRes.body.client_seed, xssPayload, 'XSS should be stored as plain text');
    }
  });

  it('should handle SQL injection attempt in query params safely', async () => {
    const sqliPayload = "'; DROP TABLE users; --";
    const res = await apiRequest(
      'GET',
      `/api/v1/history?result=${encodeURIComponent(sqliPayload)}`,
      { token },
    );
    // Should reject with 400 (invalid enum) rather than executing SQL
    assert.ok(
      [200, 400].includes(res.status),
      `Unexpected status for SQL injection: ${res.status}: ${JSON.stringify(res.body)}`,
    );
  });

  it('should handle SQL injection attempt in path params safely', async () => {
    const sqliPayload = "1'; DROP TABLE game_rounds; --";
    const res = await apiRequest(
      'GET',
      `/api/v1/history/${encodeURIComponent(sqliPayload)}`,
      { token },
    );
    // Should return 404 (invalid UUID) not 500
    assert.ok(
      [400, 404].includes(res.status),
      `Expected 400 or 404 for SQL injection path, got ${res.status}: ${JSON.stringify(res.body)}`,
    );
  });

  it('should return 404 for unknown routes', async () => {
    const res = await apiRequest('GET', '/api/v1/nonexistent');
    assert.equal(res.status, 404);
  });
});
