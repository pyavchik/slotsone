import { addFeature, addSeverity } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { registerAndInjectToken } from '../../src/helpers/api.helper.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import GamePage from '../../src/pages/GamePage.js';
import LobbyPage from '../../src/pages/LobbyPage.js';
import HistoryPage from '../../src/pages/HistoryPage.js';
import AuthPage from '../../src/pages/AuthPage.js';

describe('Game — HUD buttons', () => {
  let email: string;

  before(async () => {
    addFeature('Game');
    addSeverity('normal');

    email = uniqueEmail();
    await registerAndInjectToken(email, DEFAULT_PASSWORD, TEST_CONFIG.paths.megaFortune);
    await GamePage.waitForGameReady();
  });

  it('should display balance in HUD', async () => {
    const balance = await GamePage.getBalance();
    expect(balance).toBeTruthy();
    expect(balance.length).toBeGreaterThan(0);
  });

  it('should navigate to history from HUD', async () => {
    await GamePage.tapHistoryButton();
    await HistoryPage.waitForPageLoad();
    expect(await HistoryPage.isDisplayed()).toBe(true);

    // Go back to game
    await HistoryPage.tapBack();
    await GamePage.waitForPageLoad();
  });

  it('should navigate to lobby from HUD', async () => {
    await GamePage.tapLobbyButton();
    await LobbyPage.waitForPageLoad();
    expect(await LobbyPage.isDisplayed()).toBe(true);

    // Re-enter game
    await LobbyPage.openGameByTitle('Mega Fortune');
    await GamePage.waitForGameReady();
  });

  it('should logout from HUD', async () => {
    await GamePage.tapLogoutButton();

    // Should redirect to login
    await AuthPage.waitForPageLoad();
    expect(await AuthPage.isDisplayed()).toBe(true);
  });
});
