import { addFeature, addSeverity, addTag, addTestType } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { registerAndInjectToken } from '../../src/helpers/api.helper.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import LobbyPage from '../../src/pages/LobbyPage.js';

describe('Lobby — Navigation', () => {
  before(async () => {
    addFeature('Lobby');
    addSeverity('normal');
    addTag('regression');
    addTestType('regression');

    const email = uniqueEmail();
    await registerAndInjectToken(email, DEFAULT_PASSWORD, TEST_CONFIG.paths.lobby);
    await LobbyPage.waitForGamesLoaded();
  });

  it('should display category tabs', async () => {
    const tabs = await LobbyPage.getCategoryTabs();
    expect(tabs.length).toBeGreaterThanOrEqual(2);
  });

  it('should have "slots" as the default active tab', async () => {
    const active = await LobbyPage.getActiveCategoryTab();
    expect(active.toLowerCase()).toContain('slots');
  });

  it('should switch between category tabs', async () => {
    await LobbyPage.selectCategory('roulette');
    const active = await LobbyPage.getActiveCategoryTab();
    expect(active.toLowerCase()).toContain('roulette');

    // Switch back
    await LobbyPage.selectCategory('slots');
    const slotsActive = await LobbyPage.getActiveCategoryTab();
    expect(slotsActive.toLowerCase()).toContain('slots');
  });

  it('should display game cards', async () => {
    const count = await LobbyPage.getGameCardCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should search for a game by name', async () => {
    await LobbyPage.searchGame('Mega');
    // Allow UI to filter
    await browser.pause(500);
    const titles = await LobbyPage.getGameCardTitles();
    const hasMatch = titles.some((t) => t.toLowerCase().includes('mega'));
    expect(hasMatch).toBe(true);
    await LobbyPage.clearSearch();
  });

  it('should sort games by name A-Z', async () => {
    await LobbyPage.selectSort('Name A-Z');
    await browser.pause(500);
    const titles = await LobbyPage.getGameCardTitles();
    expect(titles.length).toBeGreaterThan(0);
    // Verify sorted order
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });

  it('should display the balance pill in the header', async () => {
    // Scroll to top to ensure header is visible on mobile
    await browser.execute(() => window.scrollTo(0, 0));
    await browser.pause(500);
    const balance = await LobbyPage.getBalance();
    expect(balance.length).toBeGreaterThan(0);
  });
});
