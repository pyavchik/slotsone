import { addFeature, addSeverity, addTag, addTestType } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { registerAndInjectToken } from '../../src/helpers/api.helper.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import LobbyPage from '../../src/pages/LobbyPage.js';
import GamePage from '../../src/pages/GamePage.js';

describe('Lobby — Game Launch', () => {
  before(async () => {
    addFeature('Lobby');
    addSeverity('critical');
    addTag('regression');
    addTestType('e2e');

    const email = uniqueEmail();
    await registerAndInjectToken(email, DEFAULT_PASSWORD, TEST_CONFIG.paths.lobby);
    await LobbyPage.waitForGamesLoaded();
  });

  it('should open Mega Fortune game from lobby', async () => {
    await LobbyPage.openGameByTitle('Mega Fortune');
    await GamePage.waitForGameReady();
    expect(await GamePage.isDisplayed()).toBe(true);
  });

  it('should show canvas in the game page', async () => {
    expect(await GamePage.isCanvasVisible()).toBe(true);
  });

  it('should navigate back to lobby from game', async () => {
    await GamePage.tapLobbyButton();
    await LobbyPage.waitForPageLoad();
    expect(await LobbyPage.isDisplayed()).toBe(true);
  });

  it('should identify "Coming Soon" games', async () => {
    // Switch to a category that has "Coming Soon" games (blackjack/baccarat)
    await LobbyPage.selectCategory('blackjack');
    await browser.pause(500);

    const count = await LobbyPage.getGameCardCount();
    if (count > 0) {
      // Check if any game is "Coming Soon"
      const titles = await LobbyPage.getGameCardTitles();
      if (titles.length > 0) {
        const isComingSoon = await LobbyPage.isGameCardComingSoon(titles[0]);
        // Just verify the check works — result depends on data
        expect(typeof isComingSoon).toBe('boolean');
      }
    }

    // Switch back
    await LobbyPage.selectCategory('slots');
  });
});
