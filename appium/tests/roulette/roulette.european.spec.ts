import { addFeature, addSeverity, addTag, addTestType } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { registerAndInjectToken } from '../../src/helpers/api.helper.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import RoulettePage from '../../src/pages/RoulettePage.js';

describe('Roulette — European', () => {
  before(async () => {
    addFeature('Roulette');
    addSeverity('normal');
    addTag('regression');
    addTestType('e2e');

    const email = uniqueEmail();
    await registerAndInjectToken(email, DEFAULT_PASSWORD, TEST_CONFIG.paths.europeanRoulette);
    await RoulettePage.waitForGameReady();
  });

  it('should display the European roulette page', async () => {
    expect(await RoulettePage.isDisplayed()).toBe(true);
  });

  it('should display the wheel area', async () => {
    expect(await RoulettePage.isWheelAreaDisplayed()).toBe(true);
  });

  it('should display tab bar with options', async () => {
    const tabs = await RoulettePage.getTabs();
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('should switch between tabs', async () => {
    const tabs = await RoulettePage.getTabs();
    if (tabs.length >= 2) {
      await RoulettePage.selectTab(tabs[1]);
      // Just verify no error occurred
      expect(await RoulettePage.isDisplayed()).toBe(true);

      await RoulettePage.selectTab(tabs[0]);
      expect(await RoulettePage.isDisplayed()).toBe(true);
    }
  });

  it('should not show an error state', async () => {
    expect(await RoulettePage.isErrorDisplayed()).toBe(false);
  });
});
