import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// ---------------------------------------------------------------------------
// Root pino instance
// ---------------------------------------------------------------------------

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
const IS_DEV = process.env.NODE_ENV !== 'production';

const rootLogger = pino({
  level: LOG_LEVEL,
  ...(IS_DEV
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss.l' },
        },
      }
    : {}),
});

// ---------------------------------------------------------------------------
// AsyncLocalStorage — request context propagation
// ---------------------------------------------------------------------------

export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

export function setUserId(userId: string): void {
  const ctx = asyncLocalStorage.getStore();
  if (ctx) ctx.userId = userId;
}

export function setSessionId(sessionId: string): void {
  const ctx = asyncLocalStorage.getStore();
  if (ctx) ctx.sessionId = sessionId;
}

// ---------------------------------------------------------------------------
// getLogger — child logger auto-bound with current request context
// ---------------------------------------------------------------------------

export function getLogger(extra?: Record<string, unknown>): pino.Logger {
  const ctx = asyncLocalStorage.getStore();
  const bindings: Record<string, unknown> = {};
  if (ctx) {
    bindings.requestId = ctx.requestId;
    if (ctx.userId) bindings.userId = ctx.userId;
    if (ctx.sessionId) bindings.sessionId = ctx.sessionId;
  }
  if (extra) Object.assign(bindings, extra);
  return Object.keys(bindings).length > 0 ? rootLogger.child(bindings) : rootLogger;
}

// ---------------------------------------------------------------------------
// Backward-compatible `logger` export
//
// Existing callers use: logger.info('message', { context })
// Pino expects:         logger.info({ context }, 'message')
//
// This wrapper translates automatically so db.ts, index.ts, imageService.ts,
// and routes/images.ts continue working without changes.
// ---------------------------------------------------------------------------

interface LegacyLogContext {
  [key: string]: unknown;
}

function wrapLevel(level: 'info' | 'warn' | 'error') {
  return (message: string, context?: LegacyLogContext): void => {
    const log = getLogger();
    if (context) {
      // Pino: mergingObject first, then message string
      log[level](context, message);
    } else {
      log[level](message);
    }
  };
}

export const logger = {
  info: wrapLevel('info'),
  warn: wrapLevel('warn'),
  error: wrapLevel('error'),
};

export { rootLogger };
