import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_ID } from '../engine/gameConfig.js';
import {
  cleanupStoreForTests,
  createSession,
  executeSpin,
  getBalance,
  getHistory,
  getStoreDiagnosticsForTests,
  resetStoreForTests,
} from '../store.js';
import { initDb } from '../db.js';
import { createUser, resetUserStoreForTests } from '../userStore.js';

const CURRENCY = 'USD';

// These tests require a running PostgreSQL database
process.env.DATABASE_URL ??= 'postgres://slotsone:slotsone@localhost:5432/slotsone';
await initDb();

async function createTestUser(email: string): Promise<string> {
  const user = await createUser(email, 'test-hash-placeholder');
  return user.id;
}

test('executeSpin applies bet and win delta to user balance and history', async () => {
  await resetUserStoreForTests();
  resetStoreForTests();

  const userId = await createTestUser('test-balance@test.com');
  const session = createSession(userId, GAME_ID);
  const initialBalance = (await getBalance(userId, CURRENCY)).amount;

  const response = await executeSpin(
    userId,
    session.session_id,
    GAME_ID,
    1,
    CURRENCY,
    20,
    'spin-balance-1'
  );
  assert.equal(response.code, 200);
  if ('error' in response) {
    throw new Error(`unexpected error response: ${response.error}`);
  }

  const expectedBalance =
    Math.round((initialBalance - 1 + response.result.outcome.win.amount) * 100) / 100;
  assert.equal(response.result.balance.amount, expectedBalance);

  const history = await getHistory(userId, 10, 0);
  assert.ok(history.total >= 1);
  assert.equal(history.items[0]?.spin_id, response.result.spin_id);
});

test('executeSpin idempotency returns original result and avoids duplicate history writes', async () => {
  await resetUserStoreForTests();
  resetStoreForTests();

  const userId = await createTestUser('test-idempotency@test.com');
  const session = createSession(userId, GAME_ID);
  const key = 'fixed-idempotency-key-1';

  const first = await executeSpin(userId, session.session_id, GAME_ID, 1, CURRENCY, 20, key);
  assert.equal(first.code, 200);
  if ('error' in first) {
    throw new Error(`unexpected first spin error: ${first.error}`);
  }

  const second = await executeSpin(userId, session.session_id, GAME_ID, 1, CURRENCY, 20, key);
  assert.equal(second.code, 200);
  if ('error' in second) {
    throw new Error(`unexpected idempotent replay error: ${second.error}`);
  }

  assert.equal(second.result.spin_id, first.result.spin_id);
  assert.equal(second.result.balance.amount, first.result.balance.amount);
});

test('executeSpin rate limit returns 429 and retry metadata after threshold', async () => {
  await resetUserStoreForTests();
  resetStoreForTests();

  const userId = await createTestUser('test-ratelimit@test.com');
  const session = createSession(userId, GAME_ID);

  for (let i = 0; i < 5; i++) {
    const result = await executeSpin(
      userId,
      session.session_id,
      GAME_ID,
      0.1,
      CURRENCY,
      20,
      `ok-${i}`
    );
    assert.equal(result.code, 200);
    if ('error' in result) {
      throw new Error(`unexpected spin error at index ${i}: ${result.error}`);
    }
  }

  const limited = await executeSpin(
    userId,
    session.session_id,
    GAME_ID,
    0.1,
    CURRENCY,
    20,
    'limited-6'
  );
  assert.equal(limited.code, 429);
  if (!('error' in limited)) {
    throw new Error('expected 429 error response');
  }
  assert.equal(limited.error, 'Too many requests');
  assert.ok((limited.retry_after_seconds ?? 0) >= 1);
});

test('periodic cleanup removes stale rate-limit, session, and idempotency entries', async () => {
  await resetUserStoreForTests();
  resetStoreForTests();

  const originalDateNow = Date.now;
  let now = 1_700_000_000_000;
  Date.now = () => now;

  try {
    const userIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const userId = await createTestUser(`cleanup-user-${i}@test.com`);
      userIds.push(userId);
      const session = createSession(userId, GAME_ID);
      const result = await executeSpin(
        userId,
        session.session_id,
        GAME_ID,
        0.1,
        CURRENCY,
        20,
        `cleanup-key-${i}`
      );
      assert.equal(result.code, 200);
      if ('error' in result) {
        throw new Error(`unexpected cleanup setup spin error: ${result.error}`);
      }
    }

    const before = getStoreDiagnosticsForTests();
    assert.equal(before.sessions, 3);
    assert.equal(before.idempotency, 3);
    assert.equal(before.rateCounts, 3);

    now += 1001;
    cleanupStoreForTests(now);
    const afterRateWindow = getStoreDiagnosticsForTests();
    assert.equal(afterRateWindow.rateCounts, 0);
    assert.equal(afterRateWindow.idempotency, 3);
    assert.equal(afterRateWindow.sessions, 3);

    now += 24 * 60 * 60 * 1000 + 1;
    cleanupStoreForTests(now);
    const afterLongTtl = getStoreDiagnosticsForTests();
    assert.equal(afterLongTtl.sessions, 0);
    assert.equal(afterLongTtl.idempotency, 0);
  } finally {
    Date.now = originalDateNow;
  }
});
