import { readFileSync } from 'fs';
import { sign } from 'crypto';

function readPrivateKey(): string {
  const inlineKey = process.env.JWT_PRIVATE_KEY;
  if (inlineKey) {
    return inlineKey.includes('\\n') ? inlineKey.replace(/\\n/g, '\n') : inlineKey;
  }
  const filePath = process.env.JWT_PRIVATE_KEY_FILE ?? './jwt_private.pem';
  return readFileSync(filePath, 'utf8');
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

export function signToken(sub: string, ttlSeconds = 900): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    sub,
    iss: process.env.JWT_ISSUER ?? 'slotsone-dev',
    aud: process.env.JWT_AUDIENCE ?? 'slotsone-client',
    iat: now,
    exp: now + ttlSeconds,
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign('RSA-SHA256', Buffer.from(signingInput), readPrivateKey()).toString(
    'base64url'
  );

  return `${signingInput}.${signature}`;
}
