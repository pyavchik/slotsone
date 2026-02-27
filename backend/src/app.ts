import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { loadEnvironmentFiles } from './config/loadEnv.js';
import { validateAuthEnvironment } from './config/validateAuthEnv.js';
import { openApiSpec } from './docs/openapi.js';
import { logger } from './logger.js';
import gameRoutes from './routes/game.js';
import authRoutes from './routes/auth.js';

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
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  const requestId = randomUUID().slice(0, 12);
  const startedAt = process.hrtime.bigint();
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info('http_request', {
      request_id: requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Math.round(elapsedMs * 10) / 10,
      user_agent: req.headers['user-agent'] ?? 'unknown',
      remote_ip: req.ip,
    });
  });

  next();
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

// POST /api/v1/auth/register, POST /api/v1/auth/login
app.use('/api/v1/auth', authRoutes);

// POST /api/v1/game/init, POST /api/v1/spin, GET /api/v1/history
app.use('/api/v1', gameRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', code: 'not_found' });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  logger.error('http_unhandled_error', {
    method: req.method,
    path: req.originalUrl,
    err,
  });

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(500).json({ error: 'Internal server error', code: 'internal_error' });
});
