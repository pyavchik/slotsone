import { addFeature, addSeverity } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { registerAndInjectToken } from '../../src/helpers/api.helper.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import GamePage from '../../src/pages/GamePage.js';
import HistoryPage from '../../src/pages/HistoryPage.js';

describe('History — List & table', () => {
  before(async () => {
    addFeature('History');
    addSeverity('normal');

    // Register, play a few rounds to generate history, then navigate to history
    const email = uniqueEmail();
    await registerAndInjectToken(email, DEFAULT_PASSWORD, TEST_CONFIG.paths.megaFortune);
    await GamePage.waitForGameReady();

    // Generate some history entries
    for (let i = 0; i < 3; i++) {
      await GamePage.spinAndWaitForResult();
    }

    await GamePage.tapHistoryButton();
    await HistoryPage.waitForPageLoad();
  });

  it('should display the history page', async () => {
    expect(await HistoryPage.isDisplayed()).toBe(true);
  });

  it('should show a title', async () => {
    const title = await HistoryPage.getTitle();
    expect(title.length).toBeGreaterThan(0);
  });

  it('should display history table with entries', async () => {
    expect(await HistoryPage.isTableDisplayed()).toBe(true);
    const rowCount = await HistoryPage.getRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(3);
  });

  it('should display summary cards', async () => {
    const cardCount = await HistoryPage.getSummaryCardCount();
    expect(cardCount).toBeGreaterThan(0);
  });

  it('should have detail links for each row', async () => {
    // Tap the first detail link — should navigate to round detail
    await HistoryPage.tapDetailLink(0);
    await browser.waitUntil(
      async () => (await browser.getUrl()).includes('/round/'),
      { timeout: TEST_CONFIG.timeouts.navigation },
    );

    // Navigate back
    await browser.back();
    await HistoryPage.waitForPageLoad();
  });

  it('should show back button', async () => {
    await HistoryPage.tapBack();
    await GamePage.waitForPageLoad();
    expect(await GamePage.isDisplayed()).toBe(true);
  });
});
