import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'crypto';

function scryptAsync(
  password: string,
  salt: string,
  keyLen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

const N = 16384;
const r = 8;
const p = 1;
const KEY_LEN = 64;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(plain, salt, KEY_LEN, { N, r, p });
  return `scrypt:${N}:${r}:${p}:${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, costN, costR, costP, salt, hashHex] = parts;
  const options: ScryptOptions = { N: Number(costN), r: Number(costR), p: Number(costP) };
  const keyLen = hashHex.length / 2;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(plain, salt, keyLen, options);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
