import { addFeature, addSeverity, addTag, addTestType } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { registerAndInjectToken } from '../../src/helpers/api.helper.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import GamePage from '../../src/pages/GamePage.js';
import HistoryPage from '../../src/pages/HistoryPage.js';
import RoundDetailPage from '../../src/pages/RoundDetailPage.js';

describe('History — Round detail', () => {
  before(async () => {
    addFeature('History');
    addSeverity('normal');
    addTag('sanity');
    addTestType('functional');

    const email = uniqueEmail();
    await registerAndInjectToken(email, DEFAULT_PASSWORD, TEST_CONFIG.paths.megaFortune);
    await GamePage.waitForGameReady();

    // Generate at least one round
    await GamePage.spinAndWaitForResult();

    await GamePage.tapHistoryButton();
    await HistoryPage.waitForPageLoad();

    // Open the first round detail
    await HistoryPage.tapDetailLink(0);
    await RoundDetailPage.waitForPageLoad();
  });

  it('should display the round detail page', async () => {
    expect(await RoundDetailPage.isDisplayed()).toBe(true);
  });

  it('should show round title', async () => {
    const title = await RoundDetailPage.getTitle();
    expect(title.length).toBeGreaterThan(0);
  });

  it('should display the reel grid', async () => {
    expect(await RoundDetailPage.isReelGridDisplayed()).toBe(true);
    const cellCount = await RoundDetailPage.getReelCellCount();
    expect(cellCount).toBeGreaterThan(0);
  });

  it('should display the finance grid', async () => {
    expect(await RoundDetailPage.isFinanceGridDisplayed()).toBe(true);
    const items = await RoundDetailPage.getFinanceItems();
    expect(items.length).toBeGreaterThan(0);
  });

  it('should toggle provably fair section', async () => {
    await RoundDetailPage.toggleProvablyFair();
    expect(await RoundDetailPage.isProvablyFairVisible()).toBe(true);
  });

  it('should verify provably fair hash', async () => {
    // Ensure provably fair is visible
    if (!(await RoundDetailPage.isProvablyFairVisible())) {
      await RoundDetailPage.toggleProvablyFair();
    }

    await RoundDetailPage.tapVerify();
    const isPass = await RoundDetailPage.isVerifyPass();
    expect(isPass).toBe(true);
  });

  it('should navigate back to history', async () => {
    await RoundDetailPage.tapBack();
    await HistoryPage.waitForPageLoad();
    expect(await HistoryPage.isDisplayed()).toBe(true);
  });
});
