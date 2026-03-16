import { baseConfig } from './wdio.conf.js';

export const config = {
  ...baseConfig,

  services: [
    [
      'appium',
      {
        args: {
          relaxedSecurity: true,
        },
      },
    ],
  ],

  capabilities: [
    {
      'appium:platformName': 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'Android Emulator',
      browserName: 'chrome',
      'appium:chromedriverAutodownload': true,
      'appium:noReset': false,
      'appium:newCommandTimeout': 240,
    },
  ],
};
