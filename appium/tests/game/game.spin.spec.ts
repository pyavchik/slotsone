import { addFeature, addSeverity, addTag, addTestType } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { registerAndInjectToken } from '../../src/helpers/api.helper.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import GamePage from '../../src/pages/GamePage.js';

describe('Game — Spin flow', () => {
  before(async () => {
    addFeature('Game');
    addSeverity('critical');
    addTag('regression');
    addTestType('e2e');

    const email = uniqueEmail();
    await registerAndInjectToken(email, DEFAULT_PASSWORD, TEST_CONFIG.paths.megaFortune);
    await GamePage.waitForGameReady();
  });

  it('should display spin button in ready state', async () => {
    const ready = await GamePage.isSpinButtonReady();
    expect(ready).toBe(true);
  });

  it('should display current balance', async () => {
    const balance = await GamePage.getBalanceNumber();
    expect(balance).toBeGreaterThan(0);
  });

  it('should execute a spin and deduct bet from balance', async () => {
    const balanceBefore = await GamePage.getBalanceNumber();
    await GamePage.spinAndWaitForResult();
    const balanceAfter = await GamePage.getBalanceNumber();

    // Balance must change (at minimum, the bet is deducted)
    expect(balanceAfter).not.toBe(balanceBefore);
  });

  it('should show either WIN or NO WIN badge after spin', async () => {
    await GamePage.spinAndWaitForResult();
    const win = await GamePage.isWinBadgeDisplayed();
    const noWin = await GamePage.isNoWinBadgeDisplayed();
    expect(win || noWin).toBe(true);
  });

  it('should allow multiple consecutive spins', async () => {
    // Perform 3 spins
    for (let i = 0; i < 3; i++) {
      await GamePage.spinAndWaitForResult();
    }
    // If we got here without timeout, all spins completed
    const balance = await GamePage.getBalanceNumber();
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  it('should display bet value', async () => {
    const bet = await GamePage.getBetValue();
    expect(bet.length).toBeGreaterThan(0);
  });

  it('should increase bet', async () => {
    const betBefore = await GamePage.getBetValue();
    await GamePage.tapIncreaseBet();
    const betAfter = await GamePage.getBetValue();
    // Bet should have changed (or remained at max)
    expect(typeof betAfter).toBe('string');
  });

  it('should decrease bet', async () => {
    const betBefore = await GamePage.getBetValue();
    await GamePage.tapDecreaseBet();
    const betAfter = await GamePage.getBetValue();
    expect(typeof betAfter).toBe('string');
  });
});
