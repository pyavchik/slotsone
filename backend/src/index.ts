import './instrument.js';
import { app } from './app.js';
import { initDb, closePool } from './db.js';
import { logger } from './logger.js';

const PORT = Number(process.env.PORT) || 3001;
const SHUTDOWN_TIMEOUT_MS = 10_000;

await initDb();
const server = app.listen(PORT, () => {
  logger.info('server_started', { port: PORT, env: process.env.NODE_ENV ?? 'unknown' });
});

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutdown_start', { signal });

  // Hard deadline: if graceful shutdown stalls, force-exit.
  const timer = setTimeout(() => {
    logger.error('shutdown_timeout', { timeout_ms: SHUTDOWN_TIMEOUT_MS });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  timer.unref();

  server.close(async () => {
    try {
      await closePool();
      logger.info('shutdown_complete', { signal });
      process.exit(0);
    } catch (err) {
      logger.error('shutdown_pool_close_error', { err });
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('process_unhandled_rejection', { err: reason });
});

process.on('uncaughtException', (error) => {
  logger.error('process_uncaught_exception', { err: error });
  server.close(async () => {
    try {
      await closePool();
    } catch {
      /* best-effort */
    }
    process.exit(1);
  });
});
