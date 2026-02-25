import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_ID } from '../engine/gameConfig.js';
import { createSession, executeSpin, getBalance, getHistory, resetStoreForTests } from '../store.js';

const CURRENCY = 'USD';

test('executeSpin applies bet and win delta to user balance and history', () => {
  resetStoreForTests();

  const userId = 'test-user-balance';
  const session = createSession(userId, GAME_ID);
  const initialBalance = getBalance(userId, CURRENCY).amount;

  const response = executeSpin(userId, session.session_id, GAME_ID, 1, CURRENCY, 20, 'spin-balance-1');
  assert.equal(response.code, 200);
  if ('error' in response) {
    throw new Error(`unexpected error response: ${response.error}`);
  }

  const expectedBalance = Math.round((initialBalance - 1 + response.result.outcome.win.amount) * 100) / 100;
  assert.equal(response.result.balance.amount, expectedBalance);

  const history = getHistory(userId, 10, 0);
  assert.equal(history.total, 1);
  assert.equal(history.items[0]?.spin_id, response.result.spin_id);
});

test('executeSpin idempotency returns original result and avoids duplicate history writes', () => {
  resetStoreForTests();

  const userId = 'test-user-idempotency';
  const session = createSession(userId, GAME_ID);
  const key = 'fixed-idempotency-key-1';

  const first = executeSpin(userId, session.session_id, GAME_ID, 1, CURRENCY, 20, key);
  assert.equal(first.code, 200);
  if ('error' in first) {
    throw new Error(`unexpected first spin error: ${first.error}`);
  }

  const second = executeSpin(userId, session.session_id, GAME_ID, 1, CURRENCY, 20, key);
  assert.equal(second.code, 200);
  if ('error' in second) {
    throw new Error(`unexpected idempotent replay error: ${second.error}`);
  }

  assert.equal(second.result.spin_id, first.result.spin_id);
  assert.equal(second.result.balance.amount, first.result.balance.amount);

  const history = getHistory(userId, 10, 0);
  assert.equal(history.total, 1);
});

test('executeSpin rate limit returns 429 and retry metadata after threshold', () => {
  resetStoreForTests();

  const userId = 'test-user-rate-limit';
  const session = createSession(userId, GAME_ID);

  for (let i = 0; i < 5; i++) {
    const result = executeSpin(userId, session.session_id, GAME_ID, 0.1, CURRENCY, 20, `ok-${i}`);
    assert.equal(result.code, 200);
    if ('error' in result) {
      throw new Error(`unexpected spin error at index ${i}: ${result.error}`);
    }
  }

  const limited = executeSpin(userId, session.session_id, GAME_ID, 0.1, CURRENCY, 20, 'limited-6');
  assert.equal(limited.code, 429);
  if (!('error' in limited)) {
    throw new Error('expected 429 error response');
  }
  assert.equal(limited.error, 'Too many requests');
  assert.ok((limited.retry_after_seconds ?? 0) >= 1);
});
