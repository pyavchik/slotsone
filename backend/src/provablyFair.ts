import { randomBytes, createHmac, createHash } from 'crypto';

export function generateServerSeed(): string {
  return randomBytes(32).toString('hex');
}

export function hashServerSeed(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

/**
 * Derive a uint32 seed from server_seed + client_seed + nonce using HMAC-SHA256.
 * The first 4 bytes of the HMAC are read as a big-endian uint32.
 */
export function deriveSpinSeed(serverSeed: string, clientSeed: string, nonce: number): number {
  const hmac = createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const buf = hmac.digest();
  return buf.readUInt32BE(0);
}

export function hashOutcome(outcome: unknown): string {
  const json = JSON.stringify(outcome);
  return createHash('sha256').update(json).digest('hex');
}
