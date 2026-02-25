import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { loadEnvironmentFiles } from './config/loadEnv.js';
import { validateAuthEnvironment } from './config/validateAuthEnv.js';
import { openApiSpec } from './docs/openapi.js';
import gameRoutes from './routes/game.js';

loadEnvironmentFiles();
validateAuthEnvironment();

export const app = express();

const corsOrigins = (process.env.CORS_ORIGINS ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Idempotency-Key');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use((req, res, next) => {
  const startedAt = performance.now();
  res.on('finish', () => {
    const elapsedMs = performance.now() - startedAt;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} ${elapsedMs.toFixed(1)}ms`);
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

// POST /api/v1/game/init, POST /api/v1/spin, GET /api/v1/history
app.use('/api/v1', gameRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
