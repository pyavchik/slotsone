import express from 'express';
import { loadEnvironmentFiles } from './config/loadEnv.js';
import { validateAuthEnvironment } from './config/validateAuthEnv.js';

loadEnvironmentFiles();
validateAuthEnvironment();
const { default: gameRoutes } = await import('./routes/game.js');

const app = express();
app.use(express.json());

// POST /api/v1/game/init, POST /api/v1/spin, GET /api/v1/history
app.use('/api/v1', gameRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Slots API listening on http://localhost:${PORT}`);
});
