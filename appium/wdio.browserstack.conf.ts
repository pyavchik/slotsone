import { baseConfig } from './wdio.conf.js';

const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME;
const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;

if (!BROWSERSTACK_USERNAME || !BROWSERSTACK_ACCESS_KEY) {
  throw new Error(
    'BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables are required',
  );
}

export const config = {
  ...baseConfig,

  user: BROWSERSTACK_USERNAME,
  key: BROWSERSTACK_ACCESS_KEY,

  services: [
    [
      'browserstack',
      {
        browserstackLocal: false,
        testObservability: true,
      },
    ],
  ],

  capabilities: [
    // Android — Samsung Galaxy S23
    {
      'bstack:options': {
        deviceName: 'Samsung Galaxy S23',
        osVersion: '13.0',
        projectName: 'SlotsOne Mobile',
        buildName: `Appium ${new Date().toISOString().slice(0, 10)}`,
        sessionName: 'Android Chrome — Galaxy S23',
      },
      browserName: 'chrome',
    },

    // Android — Google Pixel 7
    {
      'bstack:options': {
        deviceName: 'Google Pixel 7',
        osVersion: '13.0',
        projectName: 'SlotsOne Mobile',
        buildName: `Appium ${new Date().toISOString().slice(0, 10)}`,
        sessionName: 'Android Chrome — Pixel 7',
      },
      browserName: 'chrome',
    },

    // iOS — iPhone 15
    {
      'bstack:options': {
        deviceName: 'iPhone 15',
        osVersion: '17',
        projectName: 'SlotsOne Mobile',
        buildName: `Appium ${new Date().toISOString().slice(0, 10)}`,
        sessionName: 'iOS Safari — iPhone 15',
      },
      browserName: 'safari',
    },

    // iOS — iPhone 13
    {
      'bstack:options': {
        deviceName: 'iPhone 13',
        osVersion: '15',
        projectName: 'SlotsOne Mobile',
        buildName: `Appium ${new Date().toISOString().slice(0, 10)}`,
        sessionName: 'iOS Safari — iPhone 13',
      },
      browserName: 'safari',
    },
  ],
};
