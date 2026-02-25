import { createPublicKey, verify as verifySignature } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

interface JwtHeader {
  alg?: string;
  typ?: string;
}

export interface JwtPayload {
  sub: string;
  session_id?: string;
  exp?: number;
  nbf?: number;
  iss?: string;
  aud?: string | string[];
}

function getAllowedAlgorithms(): Set<string> {
  const configured = process.env.JWT_ALLOWED_ALGS ?? 'RS256';
  return new Set(
    configured
      .split(',')
      .map((alg) => alg.trim())
      .filter(Boolean)
  );
}

function readRs256PublicKey(): string | null {
  const value = process.env.JWT_PUBLIC_KEY;
  if (!value) return null;
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
}

function parseSegment<T>(segment: string): T | null {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

function verifyRs256(signingInput: string, signatureB64Url: string): boolean {
  const publicKeyPem = readRs256PublicKey();
  if (!publicKeyPem) return false;

  let signature: Buffer;
  try {
    signature = Buffer.from(signatureB64Url, 'base64url');
  } catch {
    return false;
  }

  try {
    return verifySignature(
      'RSA-SHA256',
      Buffer.from(signingInput),
      createPublicKey(publicKeyPem),
      signature
    );
  } catch {
    return false;
  }
}

function isAudienceValid(
  aud: string | string[] | undefined,
  expectedAudience: string | undefined
): boolean {
  if (!expectedAudience) return true;
  if (typeof aud === 'string') return aud === expectedAudience;
  if (Array.isArray(aud)) return aud.includes(expectedAudience);
  return false;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'missing_token' });
    return;
  }

  const token = auth.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) {
    res.status(401).json({ error: 'Unauthorized', code: 'invalid_token' });
    return;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const header = parseSegment<JwtHeader>(encodedHeader);
  const payload = parseSegment<JwtPayload>(encodedPayload);
  if (!header || !payload || typeof payload.sub !== 'string' || payload.sub.length === 0) {
    res.status(401).json({ error: 'Unauthorized', code: 'invalid_token' });
    return;
  }

  const allowedAlgorithms = getAllowedAlgorithms();
  const algorithm = header.alg;
  if (!algorithm || !allowedAlgorithms.has(algorithm)) {
    res.status(401).json({ error: 'Unauthorized', code: 'invalid_token_alg' });
    return;
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signatureOk = algorithm === 'RS256' ? verifyRs256(signingInput, encodedSignature) : false;

  if (!signatureOk) {
    res.status(401).json({ error: 'Unauthorized', code: 'invalid_token_signature' });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && now >= payload.exp) {
    res.status(401).json({ error: 'Unauthorized', code: 'token_expired' });
    return;
  }
  if (typeof payload.nbf === 'number' && now < payload.nbf) {
    res.status(401).json({ error: 'Unauthorized', code: 'token_not_active' });
    return;
  }

  const expectedIssuer = process.env.JWT_ISSUER;
  if (expectedIssuer && payload.iss !== expectedIssuer) {
    res.status(401).json({ error: 'Unauthorized', code: 'invalid_token_issuer' });
    return;
  }

  const expectedAudience = process.env.JWT_AUDIENCE;
  if (!isAudienceValid(payload.aud, expectedAudience)) {
    res.status(401).json({ error: 'Unauthorized', code: 'invalid_token_audience' });
    return;
  }

  (req as Request & { userId: string }).userId = payload.sub;
  next();
}
