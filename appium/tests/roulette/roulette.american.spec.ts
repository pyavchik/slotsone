import { addFeature, addSeverity, addTag, addTestType } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { registerAndInjectToken } from '../../src/helpers/api.helper.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import AmericanRoulettePage from '../../src/pages/AmericanRoulettePage.js';
import LobbyPage from '../../src/pages/LobbyPage.js';

describe('Roulette — American', () => {
  before(async () => {
    addFeature('Roulette');
    addSeverity('normal');
    addTag('regression');
    addTestType('e2e');

    const email = uniqueEmail();
    await registerAndInjectToken(email, DEFAULT_PASSWORD, TEST_CONFIG.paths.americanRoulette);
    await AmericanRoulettePage.waitForGameReady();
  });

  it('should display the American roulette page', async () => {
    expect(await AmericanRoulettePage.isDisplayed()).toBe(true);
  });

  it('should display the betting table', async () => {
    expect(await AmericanRoulettePage.isBettingTableDisplayed()).toBe(true);
  });

  it('should display HUD with balance info', async () => {
    const hudValues = await AmericanRoulettePage.getHudValues();
    expect(hudValues.length).toBeGreaterThan(0);
  });

  it('should select a chip denomination', async () => {
    await AmericanRoulettePage.selectChip(1);
    // No error means chip was selected
    expect(await AmericanRoulettePage.isDisplayed()).toBe(true);
  });

  it('should place a bet on a number', async () => {
    await AmericanRoulettePage.selectChip(1);
    await AmericanRoulettePage.placeBetOnNumber(17);
    expect(await AmericanRoulettePage.isDisplayed()).toBe(true);
  });

  it('should spin and get a result', async () => {
    // Ensure there's a bet placed
    await AmericanRoulettePage.selectChip(1);
    await AmericanRoulettePage.placeBetOnNumber(7);

    await AmericanRoulettePage.tapSpin();
    await AmericanRoulettePage.waitForSpinResult();

    const result = await AmericanRoulettePage.getResult();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should show spin history after a spin', async () => {
    // Allow time for history to render after spin animation
    await browser.waitUntil(
      async () => (await AmericanRoulettePage.getHistoryCount()) > 0,
      { timeout: 10000, timeoutMsg: 'Roulette history items did not appear' },
    );
    const historyCount = await AmericanRoulettePage.getHistoryCount();
    expect(historyCount).toBeGreaterThanOrEqual(1);
  });

  it('should navigate back to lobby', async () => {
    await AmericanRoulettePage.tapLobby();
    await LobbyPage.waitForPageLoad();
    expect(await LobbyPage.isDisplayed()).toBe(true);
  });
});
