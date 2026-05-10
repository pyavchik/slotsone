import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { logger } from './logger.js';

/**
 * IMAP-backed cache for the latest Atlassian 2FA verification code.
 *
 * Connects to the configured IMAP mailbox (ukr.net by default) using IDLE so
 * codes appear within seconds of the email landing. Only emails whose sender
 * domain belongs to Atlassian are accepted, and the parsed code is rejected
 * unless it looks like the 6-character alphanumeric format Atlassian uses.
 *
 * The store is intentionally in-memory: codes expire after CODE_TTL_MS, which
 * is well under Atlassian's own validity window. Restarting the backend simply
 * drops the cache; the next email will refill it.
 */

interface Atlassian2FACode {
  code: string;
  receivedAt: number;
}

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CODE_REGEX = /\b([A-Z0-9]{6})\b/;
const ATLASSIAN_DOMAIN_RE = /@([a-z0-9-]+\.)*atlassian\.com$/i;
const RECONNECT_DELAY_MS = 15_000;

let latest: Atlassian2FACode | null = null;
let client: ImapFlow | null = null;
let started = false;

export function getLatest2FACode(): Atlassian2FACode | null {
  if (!latest) return null;
  if (Date.now() - latest.receivedAt > CODE_TTL_MS) {
    latest = null;
    return null;
  }
  return latest;
}

interface Imap2FAConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

function readConfig(): Imap2FAConfig | null {
  const user = process.env.UKR_IMAP_USER;
  const password = process.env.UKR_IMAP_PASSWORD;
  if (!user || !password) return null;

  return {
    host: process.env.UKR_IMAP_HOST ?? 'imap.ukr.net',
    port: Number(process.env.UKR_IMAP_PORT ?? 993),
    user,
    password,
  };
}

function extractCode(text: string): string | null {
  // Atlassian's email contains "enter the following code:\n\nXXXXXX". Anchor on
  // the phrase first so we don't grab a stray 6-char token from elsewhere.
  const anchor = text.match(/enter the following code[^A-Z0-9]*([A-Z0-9]{6})\b/i);
  if (anchor) return anchor[1].toUpperCase();

  const fallback = text.match(CODE_REGEX);
  return fallback ? fallback[1].toUpperCase() : null;
}

async function processMessage(
  uid: number,
  source: Buffer,
  c: ImapFlow,
  mailbox: string
): Promise<void> {
  const parsed = await simpleParser(source);
  const fromAddr = parsed.from?.value?.[0]?.address ?? '';
  if (!ATLASSIAN_DOMAIN_RE.test(fromAddr)) {
    logger.info('atlassian_2fa_skip_non_atlassian', { uid, fromAddr });
    return;
  }

  const body = `${parsed.subject ?? ''}\n${parsed.text ?? ''}`;
  const code = extractCode(body);
  if (!code) {
    logger.info('atlassian_2fa_no_code_found', { uid, fromAddr });
    return;
  }

  latest = { code, receivedAt: Date.now() };
  logger.info('atlassian_2fa_code_captured', { uid, fromAddr, codeMasked: maskCode(code) });

  try {
    await c.messageFlagsAdd({ uid: String(uid) }, ['\\Seen'], { uid: true });
  } catch (err) {
    logger.warn('atlassian_2fa_seen_flag_failed', { uid, err });
  }

  // Acknowledge the mailbox so the IDLE listener picks up subsequent EXISTS events.
  void mailbox;
}

function maskCode(code: string): string {
  return code.length <= 2 ? '***' : `${code[0]}***${code[code.length - 1]}`;
}

async function fetchUnseenAtlassian(c: ImapFlow): Promise<void> {
  const lock = await c.getMailboxLock('INBOX');
  try {
    const uids = (await c.search({ seen: false }, { uid: true })) as number[] | false;
    if (!uids || uids.length === 0) return;

    for (const uid of uids) {
      const msg = await c.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !msg.source) continue;
      await processMessage(uid, msg.source, c, 'INBOX');
    }
  } finally {
    lock.release();
  }
}

async function connectAndListen(cfg: Imap2FAConfig): Promise<void> {
  client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: true,
    auth: { user: cfg.user, pass: cfg.password },
    logger: false,
  });

  client.on('error', (err: unknown) => {
    logger.error('atlassian_2fa_imap_error', { err });
  });

  client.on('exists', () => {
    void fetchUnseenAtlassian(client!).catch((err) => {
      logger.error('atlassian_2fa_fetch_on_exists_error', { err });
    });
  });

  await client.connect();
  logger.info('atlassian_2fa_imap_connected', { host: cfg.host, user: cfg.user });

  // Drain anything already in the inbox.
  await fetchUnseenAtlassian(client);

  // Hold the mailbox open for IDLE-driven exists events.
  await client.mailboxOpen('INBOX');
  await client.idle();
}

async function runForever(cfg: Imap2FAConfig): Promise<void> {
  while (started) {
    try {
      await connectAndListen(cfg);
    } catch (err) {
      logger.error('atlassian_2fa_imap_loop_error', { err });
    } finally {
      try {
        await client?.logout();
      } catch {
        // ignore — we're already in error recovery
      }
      client = null;
    }

    if (!started) return;
    await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
  }
}

export function startAtlassian2FAWatcher(): void {
  if (started) return;

  const cfg = readConfig();
  if (!cfg) {
    logger.warn('atlassian_2fa_disabled', {
      reason: 'UKR_IMAP_USER and UKR_IMAP_PASSWORD must both be set',
    });
    return;
  }

  started = true;
  void runForever(cfg);
}

export async function stopAtlassian2FAWatcher(): Promise<void> {
  started = false;
  try {
    await client?.logout();
  } catch {
    // ignore
  }
  client = null;
}
