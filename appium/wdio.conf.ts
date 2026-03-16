import 'dotenv/config';
import type { Options } from '@wdio/types';
import { addStep, addScreenshot } from './src/helpers/allure.helper.js';

const BASE_URL = process.env.BASE_URL || 'https://pyavchik.space';

export const baseConfig: Options.Testrunner = {
  runner: 'local',

  specs: ['./tests/**/*.spec.ts'],
  exclude: [],

  maxInstances: 1,
  baseUrl: BASE_URL,

  waitforTimeout: 15000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },

  reporters: [
    'spec',
    [
      'allure',
      {
        outputDir: 'allure-results',
        disableWebdriverStepsReporting: false,
        disableWebdriverScreenshotsReporting: false,
      },
    ],
  ],

  afterTest: async function (_test, _context, result) {
    if (!result.passed) {
      await addStep('Screenshot on failure');
      await addScreenshot('failure-screenshot');
    }
  },
};
