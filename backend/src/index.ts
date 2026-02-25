import { app } from './app.js';
import { logger } from './logger.js';

const PORT = Number(process.env.PORT) || 3001;
const server = app.listen(PORT, () => {
  logger.info('server_started', { port: PORT, env: process.env.NODE_ENV ?? 'unknown' });
});

process.on('unhandledRejection', (reason) => {
  logger.error('process_unhandled_rejection', { err: reason });
});

process.on('uncaughtException', (error) => {
  logger.error('process_uncaught_exception', { err: error });
  server.close(() => {
    process.exit(1);
  });
});
