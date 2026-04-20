import { loadEnvironmentFiles } from './config/loadEnv.js';
import { initSentry } from './sentry.js';

loadEnvironmentFiles();
initSentry();
