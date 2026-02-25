import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:net';
import test from 'node:test';
import request from 'supertest';
import { app } from '../app.js';
import { DEV_HS256_SECRET } from '../config/authConstants.js';
import { resetStoreForTests } from '../store.js';

function encodeBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function createHs256Token(sub: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub,
    iss: 'slotsone-dev',
    aud: 'slotsone-client',
    exp: now + 60 * 60,
  };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', DEV_HS256_SECRET).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

async function canBindLocalPort(): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(0, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

const supportsSockets = await canBindLocalPort();

if (!supportsSockets) {
  test.skip('API contract tests skipped: local sockets are blocked in this execution environment', () => {});
} else {
  test('frontend init request contract is accepted via Authorization header', async () => {
    resetStoreForTests();
    const token = createHs256Token('contract-init-user');

    const response = await request(app)
      .post('/api/v1/game/init')
      .set('Authorization', `Bearer ${token}`)
      .send({
        game_id: 'slot_mega_fortune_001',
        platform: 'web',
        locale: 'en',
        client_version: '1.0.0',
      })
      .expect(200);

    assert.equal(typeof response.body.session_id, 'string');
    assert.equal(response.body.game_id, 'slot_mega_fortune_001');
    assert.equal(typeof response.body.balance?.amount, 'number');
    assert.equal(response.body.balance?.currency, 'USD');
    assert.ok(response.body.config);
  });

  test('frontend spin request contract returns frontend response shape', async () => {
    resetStoreForTests();
    const token = createHs256Token('contract-spin-user');

    const init = await request(app)
      .post('/api/v1/game/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ game_id: 'slot_mega_fortune_001', platform: 'web', locale: 'en', client_version: '1.0.0' })
      .expect(200);

    const sessionId = init.body.session_id as string;

    const spin = await request(app)
      .post('/api/v1/spin')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'contract-spin-key-1')
      .send({
        session_id: sessionId,
        game_id: 'slot_mega_fortune_001',
        bet: { amount: 1, currency: 'USD', lines: 20 },
        client_timestamp: Date.now(),
      })
      .expect(200);

    assert.equal(typeof spin.body.spin_id, 'string');
    assert.equal(typeof spin.body.session_id, 'string');
    assert.equal(spin.body.bet?.amount, 1);
    assert.equal(spin.body.bet?.currency, 'USD');
    assert.equal(spin.body.bet?.lines, 20);

    assert.ok(Array.isArray(spin.body.outcome?.reel_matrix));
    assert.ok(Array.isArray(spin.body.outcome?.win?.breakdown));
    assert.equal(spin.body.outcome?.grid, undefined);
    assert.equal(typeof spin.body.outcome?.win?.amount, 'number');

    const firstLineWin = (spin.body.outcome?.win?.breakdown ?? []).find((item: unknown) => {
      const line = item as { type?: string; line_index?: number; payout?: number };
      return line.type === 'line';
    }) as { line_index?: number; payout?: number } | undefined;

    if (firstLineWin) {
      assert.equal(typeof firstLineWin.line_index, 'number');
      assert.equal(typeof firstLineWin.payout, 'number');
    }
  });

  test('idempotency key is taken from header and replays return the same spin', async () => {
    resetStoreForTests();
    const token = createHs256Token('contract-idempotency-user');

    const init = await request(app)
      .post('/api/v1/game/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ game_id: 'slot_mega_fortune_001', platform: 'web', locale: 'en', client_version: '1.0.0' })
      .expect(200);

    const payload = {
      session_id: init.body.session_id,
      game_id: 'slot_mega_fortune_001',
      bet: { amount: 1, currency: 'USD', lines: 20 },
      client_timestamp: Date.now(),
    };

    const key = 'contract-idempotency-key-1';
    const first = await request(app)
      .post('/api/v1/spin')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(200);

    const replay = await request(app)
      .post('/api/v1/spin')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(200);

    assert.equal(replay.body.spin_id, first.body.spin_id);
  });
}
