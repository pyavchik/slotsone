import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import pinoHttpModule from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';

// pino-http is CJS; with esModuleInterop the default export wraps the function
const pinoHttp = pinoHttpModule as unknown as typeof pinoHttpModule.default;
import { loadEnvironmentFiles } from './config/loadEnv.js';
import { validateAuthEnvironment } from './config/validateAuthEnv.js';
import { openApiSpec } from './docs/openapi.js';
import { rootLogger, runWithContext, getLogger } from './logger.js';
import { join } from 'path';
import gameRoutes from './routes/game.js';
import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import { rouletteRoutes } from './routes/roulette.js';
import { americanRouletteRoutes } from './routes/americanRoulette.js';
import { getPool } from './db.js';

loadEnvironmentFiles();
validateAuthEnvironment();

export const app = express();

const corsOrigins = (process.env.CORS_ORIGINS ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: corsOrigins.includes('*')
    ? '*'
    : (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        callback(null, corsOrigins.includes(origin));
      },
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ---------------------------------------------------------------------------
// Request context + pino-http: structured HTTP logging with AsyncLocalStorage
// ---------------------------------------------------------------------------

const httpLogger = pinoHttp({
  logger: rootLogger,
  genReqId: () => randomUUID().slice(0, 12),
  customLogLevel(_req: IncomingMessage, res: ServerResponse, err: Error | undefined) {
    if (err || (res.statusCode ?? 500) >= 500) return 'error';
    if ((res.statusCode ?? 200) >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(raw: Record<string, unknown>) {
      const req = raw as unknown as IncomingMessage & { remoteAddress?: string };
      return {
        method: req.method,
        url: req.url,
        userAgent: req.headers?.['user-agent'],
        contentType: req.headers?.['content-type'],
        remoteAddress: req.remoteAddress,
      };
    },
    res(raw: Record<string, unknown>) {
      const res = raw as unknown as ServerResponse;
      return { statusCode: res.statusCode };
    },
  },
  customSuccessMessage(req: IncomingMessage, res: ServerResponse) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage(req: IncomingMessage, _res: ServerResponse, err: Error) {
    return `${req.method} ${req.url} failed: ${err.message}`;
  },
});

app.use((req, res, next) => {
  // Initialize pino-http (assigns req.id, req.log, response logging)
  httpLogger(req, res);
  const requestId = req.id as string;
  res.setHeader('X-Request-Id', requestId);

  // Wrap the rest of the request lifecycle in AsyncLocalStorage context
  runWithContext({ requestId }, () => next());
});

app.use(express.json({ limit: '10kb' }));

app.get('/api-docs.json', (_req, res) => {
  res.json(openApiSpec);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    explorer: true,
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Slots API Docs',
  })
);

// Serve generated images
app.use('/generated', express.static(join(process.cwd(), 'public', 'generated')));

// POST /api/v1/auth/register, POST /api/v1/auth/login
app.use('/api/v1/auth', authRoutes);

// POST /api/v1/images/generate
app.use('/api/v1', imageRoutes);

// Roulette (European)
app.use('/api/v1', rouletteRoutes);

// American Roulette
app.use('/api/v1', americanRouletteRoutes);

// POST /api/v1/game/init, POST /api/v1/spin, GET /api/v1/history
app.use('/api/v1', gameRoutes);

// ---------------------------------------------------------------------------
// Probes: /health (liveness) and /ready (readiness)
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/v1/debug-sentry', () => {
  throw new Error('Sentry smoke test');
});

app.get('/ready', async (_req, res) => {
  const checks: Record<string, { status: 'ok' | 'fail'; latency_ms?: number; error?: string }> = {};

  // --- PostgreSQL ---
  const dbStart = process.hrtime.bigint();
  try {
    const { rows } = await getPool().query<{ now: Date }>('SELECT NOW() AS now');
    const dbMs = Number(process.hrtime.bigint() - dbStart) / 1_000_000;
    checks.database = { status: 'ok', latency_ms: Math.round(dbMs * 10) / 10 };
    if (!rows[0]?.now) {
      checks.database = {
        status: 'fail',
        latency_ms: Math.round(dbMs * 10) / 10,
        error: 'unexpected empty result',
      };
    }
  } catch (err) {
    const dbMs = Number(process.hrtime.bigint() - dbStart) / 1_000_000;
    checks.database = {
      status: 'fail',
      latency_ms: Math.round(dbMs * 10) / 10,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'ready' : 'degraded', checks });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', code: 'not_found' });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  const log = getLogger();
  log.error({ method: req.method, path: req.originalUrl, err }, 'http_unhandled_error');

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(500).json({ error: 'Internal server error', code: 'internal_error' });
});
