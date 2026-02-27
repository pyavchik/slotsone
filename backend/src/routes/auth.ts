import { Router, type Request, type Response } from 'express';
import { RegisterRequestSchema, LoginRequestSchema } from '../contracts/authContract.js';
import { hashPassword, verifyPassword } from '../auth/passwordHash.js';
import { signToken } from '../auth/jwtSigner.js';
import { createUser, findUserByEmail } from '../userStore.js';
import {
  createRefreshToken,
  consumeRefreshToken,
  revokeAllRefreshTokensForUser,
  REFRESH_TOKEN_TTL_MS,
} from '../auth/refreshTokenStore.js';

const router = Router();

export const ACCESS_TOKEN_TTL = 900; // 15 minutes — short-lived, industry standard

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: COOKIE_PATH,
  });
}

/** Parse a single named cookie from the raw header without a middleware dep. */
function getRefreshCookie(req: Request): string | undefined {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx < 0) continue;
    if (part.slice(0, eqIdx).trim() === COOKIE_NAME) {
      return part.slice(eqIdx + 1).trim();
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.post('/register', async (req, res) => {
  const parsed = RegisterRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', code: 'invalid_body' });
    return;
  }

  const { email, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await createUser(email, passwordHash);
  } catch {
    res.status(409).json({ error: 'Email already registered', code: 'email_taken' });
    return;
  }

  setRefreshCookie(res, await createRefreshToken(user.id));
  res.status(201).json({
    access_token: signToken(user.id, ACCESS_TOKEN_TTL),
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL,
  });
});

router.post('/login', async (req, res) => {
  const parsed = LoginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', code: 'invalid_body' });
    return;
  }

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials', code: 'invalid_credentials' });
    return;
  }

  setRefreshCookie(res, await createRefreshToken(user.id));
  res.json({
    access_token: signToken(user.id, ACCESS_TOKEN_TTL),
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL,
  });
});

router.post('/refresh', async (req, res) => {
  const incoming = getRefreshCookie(req);
  if (!incoming) {
    res.status(401).json({ error: 'No refresh token', code: 'missing_refresh_token' });
    return;
  }

  // consumeRefreshToken rotates: it deletes the old token and returns userId.
  // If the same token is presented twice (theft detection), entry is already
  // gone so consumeRefreshToken returns null.
  const userId = await consumeRefreshToken(incoming);
  if (!userId) {
    clearRefreshCookie(res);
    res
      .status(401)
      .json({ error: 'Invalid or expired refresh token', code: 'invalid_refresh_token' });
    return;
  }

  // Issue a fresh rotation pair
  setRefreshCookie(res, await createRefreshToken(userId));
  res.json({
    access_token: signToken(userId, ACCESS_TOKEN_TTL),
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL,
  });
});

router.post('/logout', async (req, res) => {
  const incoming = getRefreshCookie(req);
  if (incoming) {
    const userId = await consumeRefreshToken(incoming);
    if (userId) await revokeAllRefreshTokensForUser(userId); // logout all devices
  }
  clearRefreshCookie(res);
  res.status(204).send();
});

export default router;
