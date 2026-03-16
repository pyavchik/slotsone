import { addFeature, addSeverity } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { registerAndInjectToken } from '../../src/helpers/api.helper.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import GamePage from '../../src/pages/GamePage.js';
import HistoryPage from '../../src/pages/HistoryPage.js';

describe('History — Filters', () => {
  before(async () => {
    addFeature('History');
    addSeverity('normal');

    const email = uniqueEmail();
    await registerAndInjectToken(email, DEFAULT_PASSWORD, TEST_CONFIG.paths.megaFortune);
    await GamePage.waitForGameReady();

    // Generate history
    for (let i = 0; i < 5; i++) {
      await GamePage.spinAndWaitForResult();
    }

    await GamePage.tapHistoryButton();
    await HistoryPage.waitForPageLoad();
  });

  it('should toggle filters section', async () => {
    await HistoryPage.toggleFilters();
    expect(await HistoryPage.isFiltersVisible()).toBe(true);
  });

  it('should filter by result type', async () => {
    const rowsBefore = await HistoryPage.getRowCount();

    await HistoryPage.selectResultFilter('Wins');
    await HistoryPage.applyFilters();
    await browser.pause(500);

    const rowsAfter = await HistoryPage.getRowCount();
    // Filtered rows should be <= total rows
    expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
  });

  it('should clear filters and show all entries', async () => {
    await HistoryPage.clearFilters();
    await browser.pause(500);

    const rowCount = await HistoryPage.getRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(5);
  });
});
