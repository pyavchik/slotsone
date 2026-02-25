import { readFileSync } from 'fs';
import { sign } from 'crypto';

function encodeBase64Url(input) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function readPrivateKey() {
  const inlineKey = process.env.JWT_PRIVATE_KEY;
  if (inlineKey) {
    return inlineKey.includes('\\n') ? inlineKey.replace(/\\n/g, '\n') : inlineKey;
  }

  const filePath = process.env.JWT_PRIVATE_KEY_FILE ?? './jwt_private.pem';
  return readFileSync(filePath, 'utf8');
}

const now = Math.floor(Date.now() / 1000);
const ttl = Number(process.env.JWT_TTL_SECONDS ?? 60 * 60 * 24 * 365);
const payload = {
  sub: process.env.JWT_SUB ?? 'demo-user-1',
  iss: process.env.JWT_ISS ?? 'slotsone-dev',
  aud: process.env.JWT_AUD ?? 'slotsone-client',
  iat: now,
  exp: now + ttl,
};

const header = { alg: 'RS256', typ: 'JWT' };
const encodedHeader = encodeBase64Url(JSON.stringify(header));
const encodedPayload = encodeBase64Url(JSON.stringify(payload));
const signingInput = `${encodedHeader}.${encodedPayload}`;
const signature = sign('RSA-SHA256', Buffer.from(signingInput), readPrivateKey()).toString('base64url');

process.stdout.write(`${signingInput}.${signature}\n`);
