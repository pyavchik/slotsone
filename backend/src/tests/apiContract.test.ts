import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { generateKeyPairSync, sign as signJwt } from 'node:crypto';
import test from 'node:test';
import request from 'supertest';
import { resetStoreForTests } from '../store.js';

function encodeBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

process.env.JWT_ALLOWED_ALGS = 'RS256';
process.env.JWT_PUBLIC_KEY = publicKeyPem;
process.env.JWT_ISSUER = 'slotsone-dev';
process.env.JWT_AUDIENCE = 'slotsone-client';

const { app } = await import('../app.js');

function createRs256Token(sub: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
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
  const signature = signJwt('RSA-SHA256', Buffer.from(signingInput), privateKey).toString('base64url');
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
  test('init rejects unauthenticated request even if user_id is supplied in body', async () => {
    resetStoreForTests();

    await request(app)
      .post('/api/v1/game/init')
      .send({
        user_id: 'spoofed-user',
        game_id: 'slot_mega_fortune_001',
        platform: 'web',
        locale: 'en',
        client_version: '1.0.0',
      })
      .expect(401);
  });

  test('frontend init request contract is accepted via Authorization header', async () => {
    resetStoreForTests();
    const token = createRs256Token('contract-init-user');

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
    const token = createRs256Token('contract-spin-user');

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

  test('spin rejects body that does not match documented schema', async () => {
    resetStoreForTests();
    const token = createRs256Token('contract-spin-validation-user');

    const init = await request(app)
      .post('/api/v1/game/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ game_id: 'slot_mega_fortune_001', platform: 'web', locale: 'en', client_version: '1.0.0' })
      .expect(200);

    await request(app)
      .post('/api/v1/spin')
      .set('Authorization', `Bearer ${token}`)
      .send({
        session_id: init.body.session_id,
        game_id: 'slot_mega_fortune_001',
        bet: { amount: 1, currency: 'USD', lines: 20 },
      })
      .expect(400)
      .expect(({ body }) => {
        assert.equal(body.code, 'invalid_body');
      });

    await request(app)
      .post('/api/v1/spin')
      .set('Authorization', `Bearer ${token}`)
      .send({
        session_id: init.body.session_id,
        game_id: 'slot_mega_fortune_001',
        bet: { amount: 1, lines: 20 },
        client_timestamp: Date.now(),
      })
      .expect(400)
      .expect(({ body }) => {
        assert.equal(body.code, 'invalid_body');
      });
  });

  test('idempotency key is taken from header and replays return the same spin', async () => {
    resetStoreForTests();
    const token = createRs256Token('contract-idempotency-user');

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

  test('history returns paginated per-user items with documented response shape', async () => {
    resetStoreForTests();

    const tokenA = createRs256Token('contract-history-user-a');
    const tokenB = createRs256Token('contract-history-user-b');

    const initA = await request(app)
      .post('/api/v1/game/init')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ game_id: 'slot_mega_fortune_001', platform: 'web', locale: 'en', client_version: '1.0.0' })
      .expect(200);

    const initB = await request(app)
      .post('/api/v1/game/init')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ game_id: 'slot_mega_fortune_001', platform: 'web', locale: 'en', client_version: '1.0.0' })
      .expect(200);

    const sessionA = initA.body.session_id as string;
    const sessionB = initB.body.session_id as string;

    const aSpinIds: string[] = [];
    const bSpinIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      const spin = await request(app)
        .post('/api/v1/spin')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Idempotency-Key', `contract-history-a-${i}`)
        .send({
          session_id: sessionA,
          game_id: 'slot_mega_fortune_001',
          bet: { amount: 1, currency: 'USD', lines: 20 },
          client_timestamp: Date.now(),
        })
        .expect(200);
      aSpinIds.push(spin.body.spin_id as string);
    }

    for (let i = 0; i < 2; i++) {
      const spin = await request(app)
        .post('/api/v1/spin')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('Idempotency-Key', `contract-history-b-${i}`)
        .send({
          session_id: sessionB,
          game_id: 'slot_mega_fortune_001',
          bet: { amount: 1, currency: 'USD', lines: 20 },
          client_timestamp: Date.now(),
        })
        .expect(200);
      bSpinIds.push(spin.body.spin_id as string);
    }

    const history = await request(app)
      .get('/api/v1/history')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ limit: 2, offset: 1 })
      .expect(200);

    assert.equal(Array.isArray(history.body.items), true);
    assert.equal(typeof history.body.total, 'number');
    assert.equal(typeof history.body.limit, 'number');
    assert.equal(typeof history.body.offset, 'number');

    assert.equal(history.body.total, 3);
    assert.equal(history.body.limit, 2);
    assert.equal(history.body.offset, 1);

    const returnedIds = (history.body.items as Array<{ spin_id: string }>).map((item) => item.spin_id);
    assert.deepEqual(returnedIds, [aSpinIds[1], aSpinIds[0]]);

    for (const spinId of bSpinIds) {
      assert.equal(returnedIds.includes(spinId), false);
    }
  });
}
