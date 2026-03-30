/**
 * SlotsOne GraphQL API Test Suite
 *
 * Tests for the GraphQL gateway that wraps the REST API.
 * Validates schema introspection, query resolution, mutations,
 * error handling, pagination, and type safety.
 *
 * Run:   node --import tsx --test tests/graphql.test.ts
 * Smoke: node --import tsx --test --test-name-pattern='smoke' tests/graphql.test.ts
 *
 * Requires a running backend with GraphQL gateway at GRAPHQL_URL
 * (default http://localhost:3001/graphql).
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.API_URL ?? 'http://localhost:3001';
const GRAPHQL_URL = process.env.GRAPHQL_URL ?? `${BASE_URL}/graphql`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, unknown>;
  }>;
}

async function gqlRequest<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
): Promise<{ status: number; body: GraphQLResponse<T> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const body = (await res.json()) as GraphQLResponse<T>;
  return { status: res.status, body };
}

async function getAuthToken(): Promise<string> {
  const email = `gql_test_${crypto.randomUUID().slice(0, 8)}@test.com`;
  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPass123!' }),
  });
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let token = '';

// ---------------------------------------------------------------------------
// Schema Introspection Tests
// ---------------------------------------------------------------------------

describe('GraphQL — Schema Introspection', () => {
  it('[smoke] schema exposes __schema with queryType', async () => {
    const { status, body } = await gqlRequest<{
      __schema: { queryType: { name: string } };
    }>(`{
      __schema {
        queryType { name }
      }
    }`);

    assert.equal(status, 200);
    assert.ok(body.data?.__schema);
    assert.equal(body.data.__schema.queryType.name, 'Query');
  });

  it('schema contains expected types: Player, Game, GameRound, Wallet', async () => {
    const { body } = await gqlRequest<{
      __schema: { types: Array<{ name: string; kind: string }> };
    }>(`{
      __schema {
        types {
          name
          kind
        }
      }
    }`);

    const typeNames = body.data?.__schema.types.map((t) => t.name) ?? [];
    const expectedTypes = ['Player', 'Game', 'GameRound', 'Wallet', 'SpinResult'];

    for (const expected of expectedTypes) {
      assert.ok(
        typeNames.includes(expected),
        `Schema should contain type "${expected}". Found: ${typeNames.filter((n) => !n.startsWith('__')).join(', ')}`,
      );
    }
  });

  it('Query type has expected root fields', async () => {
    const { body } = await gqlRequest<{
      __type: { fields: Array<{ name: string }> };
    }>(`{
      __type(name: "Query") {
        fields {
          name
        }
      }
    }`);

    const fieldNames = body.data?.__type?.fields.map((f) => f.name) ?? [];
    const expectedFields = ['me', 'games', 'gameHistory', 'wallet'];

    for (const field of expectedFields) {
      assert.ok(
        fieldNames.includes(field),
        `Query should have field "${field}". Found: ${fieldNames.join(', ')}`,
      );
    }
  });

  it('Mutation type has expected root fields', async () => {
    const { body } = await gqlRequest<{
      __type: { fields: Array<{ name: string }> };
    }>(`{
      __type(name: "Mutation") {
        fields {
          name
        }
      }
    }`);

    const fieldNames = body.data?.__type?.fields.map((f) => f.name) ?? [];
    const expectedMutations = ['login', 'register', 'spin', 'initGame'];

    for (const mutation of expectedMutations) {
      assert.ok(
        fieldNames.includes(mutation),
        `Mutation should have field "${mutation}". Found: ${fieldNames.join(', ')}`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Authentication Mutations
// ---------------------------------------------------------------------------

describe('GraphQL — Authentication', () => {
  const testEmail = `gql_auth_${crypto.randomUUID().slice(0, 8)}@test.com`;

  it('[smoke] register mutation returns access token', async () => {
    const { status, body } = await gqlRequest<{
      register: { accessToken: string; tokenType: string; expiresIn: number };
    }>(
      `mutation Register($input: RegisterInput!) {
        register(input: $input) {
          accessToken
          tokenType
          expiresIn
        }
      }`,
      { input: { email: testEmail, password: 'TestPass123!' } },
    );

    assert.equal(status, 200);
    assert.ok(!body.errors, `Expected no errors, got: ${JSON.stringify(body.errors)}`);
    assert.ok(body.data?.register.accessToken);
    assert.equal(body.data?.register.tokenType, 'bearer');
    assert.ok((body.data?.register.expiresIn ?? 0) > 0);

    token = body.data!.register.accessToken;
  });

  it('login mutation returns access token for existing user', async () => {
    const { body } = await gqlRequest<{
      login: { accessToken: string; tokenType: string };
    }>(
      `mutation Login($input: LoginInput!) {
        login(input: $input) {
          accessToken
          tokenType
        }
      }`,
      { input: { email: testEmail, password: 'TestPass123!' } },
    );

    assert.ok(!body.errors);
    assert.ok(body.data?.login.accessToken);
  });

  it('login mutation with wrong password returns error', async () => {
    const { body } = await gqlRequest(
      `mutation Login($input: LoginInput!) {
        login(input: $input) {
          accessToken
        }
      }`,
      { input: { email: testEmail, password: 'WrongPassword!' } },
    );

    assert.ok(body.errors);
    assert.ok(body.errors.length > 0);
    const errorMsg = body.errors[0].message.toLowerCase();
    assert.ok(
      errorMsg.includes('invalid') || errorMsg.includes('unauthorized') || errorMsg.includes('credentials'),
      `Expected auth error, got: ${errorMsg}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Game Queries
// ---------------------------------------------------------------------------

describe('GraphQL — Game Queries', () => {
  before(async () => {
    if (!token) {
      token = await getAuthToken();
    }
  });

  it('[smoke] games query returns list of available games', async () => {
    const { body } = await gqlRequest<{
      games: Array<{ id: string; name: string; type: string; rtp: number }>;
    }>(
      `{
        games {
          id
          name
          type
          rtp
        }
      }`,
      undefined,
      token,
    );

    assert.ok(!body.errors, `Expected no errors: ${JSON.stringify(body.errors)}`);
    assert.ok(Array.isArray(body.data?.games));
    assert.ok((body.data?.games.length ?? 0) > 0, 'Should have at least one game');

    const game = body.data!.games[0];
    assert.ok(game.id);
    assert.ok(game.name);
    assert.ok(typeof game.rtp === 'number');
  });

  it('wallet query returns balance and currency', async () => {
    const { body } = await gqlRequest<{
      wallet: { balance: number; currency: string };
    }>(
      `{
        wallet {
          balance
          currency
        }
      }`,
      undefined,
      token,
    );

    assert.ok(!body.errors);
    assert.ok(typeof body.data?.wallet.balance === 'number');
    assert.ok(body.data?.wallet.currency);
  });

  it('me query returns current user profile', async () => {
    const { body } = await gqlRequest<{
      me: { id: string; email: string };
    }>(
      `{
        me {
          id
          email
        }
      }`,
      undefined,
      token,
    );

    assert.ok(!body.errors);
    assert.ok(body.data?.me.id);
    assert.ok(body.data?.me.email);
    assert.ok(body.data!.me.email.includes('@'));
  });
});

// ---------------------------------------------------------------------------
// Game Session Mutations
// ---------------------------------------------------------------------------

describe('GraphQL — Game Session', () => {
  let sessionId = '';

  before(async () => {
    if (!token) {
      token = await getAuthToken();
    }
  });

  it('[smoke] initGame mutation returns session and config', async () => {
    const { body } = await gqlRequest<{
      initGame: {
        sessionId: string;
        gameId: string;
        config: { reels: number; rows: number; rtp: number };
        balance: { amount: number; currency: string };
      };
    }>(
      `mutation InitGame($input: InitGameInput!) {
        initGame(input: $input) {
          sessionId
          gameId
          config {
            reels
            rows
            rtp
          }
          balance {
            amount
            currency
          }
        }
      }`,
      { input: { gameId: 'slot_mega_fortune_001', currency: 'USD' } },
      token,
    );

    assert.ok(!body.errors, `Expected no errors: ${JSON.stringify(body.errors)}`);
    assert.ok(body.data?.initGame.sessionId);
    assert.ok(body.data?.initGame.config.reels > 0);
    assert.ok(body.data?.initGame.balance.amount >= 0);

    sessionId = body.data!.initGame.sessionId;
  });

  it('spin mutation executes and returns outcome', async () => {
    if (!sessionId) return;

    const { body } = await gqlRequest<{
      spin: {
        spinId: string;
        balance: { amount: number; currency: string };
        outcome: {
          reelMatrix: string[][];
          win: { amount: number };
        };
      };
    }>(
      `mutation Spin($input: SpinInput!) {
        spin(input: $input) {
          spinId
          balance {
            amount
            currency
          }
          outcome {
            reelMatrix
            win {
              amount
            }
          }
        }
      }`,
      {
        input: {
          sessionId,
          gameId: 'slot_mega_fortune_001',
          bet: { amount: 0.1, currency: 'USD', lines: 20 },
        },
      },
      token,
    );

    assert.ok(!body.errors, `Expected no errors: ${JSON.stringify(body.errors)}`);
    assert.ok(body.data?.spin.spinId);
    assert.ok(Array.isArray(body.data?.spin.outcome.reelMatrix));
    assert.ok(typeof body.data?.spin.outcome.win.amount === 'number');
  });
});

// ---------------------------------------------------------------------------
// Pagination & Filtering
// ---------------------------------------------------------------------------

describe('GraphQL — Pagination', () => {
  before(async () => {
    if (!token) {
      token = await getAuthToken();
    }
  });

  it('gameHistory supports limit and offset pagination', async () => {
    const { body } = await gqlRequest<{
      gameHistory: {
        items: Array<{ id: string; gameId: string; createdAt: string }>;
        total: number;
        hasMore: boolean;
      };
    }>(
      `query History($limit: Int, $offset: Int) {
        gameHistory(limit: $limit, offset: $offset) {
          items {
            id
            gameId
            createdAt
          }
          total
          hasMore
        }
      }`,
      { limit: 5, offset: 0 },
      token,
    );

    assert.ok(!body.errors, `Expected no errors: ${JSON.stringify(body.errors)}`);
    assert.ok(body.data?.gameHistory);
    assert.ok(Array.isArray(body.data.gameHistory.items));
    assert.ok(typeof body.data.gameHistory.total === 'number');
    assert.ok(typeof body.data.gameHistory.hasMore === 'boolean');
    assert.ok(body.data.gameHistory.items.length <= 5);
  });

  it('gameHistory supports gameId filter', async () => {
    const { body } = await gqlRequest<{
      gameHistory: {
        items: Array<{ gameId: string }>;
      };
    }>(
      `query FilteredHistory($gameId: String) {
        gameHistory(gameId: $gameId, limit: 10) {
          items {
            gameId
          }
        }
      }`,
      { gameId: 'slot_mega_fortune_001' },
      token,
    );

    assert.ok(!body.errors);
    const items = body.data?.gameHistory?.items ?? [];
    for (const item of items) {
      assert.equal(item.gameId, 'slot_mega_fortune_001');
    }
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------

describe('GraphQL — Error Handling', () => {
  it('returns error for malformed query syntax', async () => {
    const { body } = await gqlRequest('{ this is not valid graphql }');
    assert.ok(body.errors);
    assert.ok(body.errors.length > 0);
  });

  it('returns error for unknown field', async () => {
    const { body } = await gqlRequest('{ nonExistentField }');
    assert.ok(body.errors);
  });

  it('returns error for unauthenticated protected query', async () => {
    const { body } = await gqlRequest(`{
      wallet {
        balance
        currency
      }
    }`);

    assert.ok(body.errors);
    const errorMsg = body.errors[0].message.toLowerCase();
    assert.ok(
      errorMsg.includes('unauthorized') || errorMsg.includes('authentication') || errorMsg.includes('token'),
      `Expected auth error, got: ${errorMsg}`,
    );
  });

  it('returns error for invalid mutation input', async () => {
    const { body } = await gqlRequest(
      `mutation Register($input: RegisterInput!) {
        register(input: $input) {
          accessToken
        }
      }`,
      { input: { email: 'not-an-email', password: '1' } },
    );

    assert.ok(body.errors);
  });

  it('query with valid token but expired session returns appropriate error', async () => {
    const { body } = await gqlRequest<{
      spin: unknown;
    }>(
      `mutation Spin($input: SpinInput!) {
        spin(input: $input) {
          spinId
        }
      }`,
      {
        input: {
          sessionId: 'expired_session_id',
          gameId: 'slot_mega_fortune_001',
          bet: { amount: 0.1, currency: 'USD', lines: 20 },
        },
      },
      token || 'expired.token.value',
    );

    assert.ok(body.errors);
  });
});

// ---------------------------------------------------------------------------
// N+1 Query Protection
// ---------------------------------------------------------------------------

describe('GraphQL — Performance', () => {
  before(async () => {
    if (!token) {
      token = await getAuthToken();
    }
  });

  it('nested query resolves without timeout', async () => {
    const start = performance.now();

    const { body } = await gqlRequest<{
      gameHistory: {
        items: Array<{
          id: string;
          gameId: string;
          bet: { amount: number };
          win: { amount: number };
        }>;
      };
    }>(
      `{
        gameHistory(limit: 10) {
          items {
            id
            gameId
            bet { amount }
            win { amount }
          }
        }
      }`,
      undefined,
      token,
    );

    const elapsed = performance.now() - start;

    assert.ok(!body.errors, `Expected no errors: ${JSON.stringify(body.errors)}`);
    // Nested query should resolve in under 5 seconds
    assert.ok(elapsed < 5000, `Query took ${elapsed}ms, expected < 5000ms`);
  });
});
