import { existsSync } from 'fs';
import { SUPPORTED_JWT_ALGORITHMS, type SupportedJwtAlgorithm } from './authConstants.js';

function parseAllowedAlgorithms(rawValue: string | undefined): SupportedJwtAlgorithm[] {
  const value = rawValue ?? 'RS256';
  const requested = value
    .split(',')
    .map((alg) => alg.trim())
    .filter(Boolean);

  if (requested.length === 0) {
    throw new Error('JWT_ALLOWED_ALGS must include at least one algorithm');
  }

  const unsupported = requested.filter(
    (alg) => !SUPPORTED_JWT_ALGORITHMS.includes(alg as SupportedJwtAlgorithm)
  );
  if (unsupported.length > 0) {
    throw new Error(
      `Unsupported algorithm(s) in JWT_ALLOWED_ALGS: ${unsupported.join(', ')}. Supported: ${SUPPORTED_JWT_ALGORITHMS.join(', ')}`
    );
  }

  return Array.from(new Set(requested as SupportedJwtAlgorithm[]));
}

export function validateAuthEnvironment(): void {
  const allowedAlgs = parseAllowedAlgorithms(process.env.JWT_ALLOWED_ALGS);
  const errors: string[] = [];

  if (allowedAlgs.includes('RS256') && !process.env.JWT_PUBLIC_KEY) {
    errors.push('JWT_PUBLIC_KEY is required when JWT_ALLOWED_ALGS includes RS256');
  }

  const hasPrivateKey =
    !!process.env.JWT_PRIVATE_KEY ||
    !!process.env.JWT_PRIVATE_KEY_FILE ||
    existsSync('./jwt_private.pem');
  if (!hasPrivateKey) {
    errors.push(
      'JWT signing key is required: set JWT_PRIVATE_KEY, JWT_PRIVATE_KEY_FILE, or provide ./jwt_private.pem'
    );
  }

  if (errors.length > 0) {
    throw new Error(`Invalid auth environment:\n- ${errors.join('\n- ')}`);
  }
}
