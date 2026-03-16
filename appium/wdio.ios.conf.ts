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
      'appium:platformName': 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': 'iPhone 15',
      'appium:platformVersion': '17.5',
      browserName: 'safari',
      'appium:noReset': false,
      'appium:newCommandTimeout': 240,
    },
  ],
};
