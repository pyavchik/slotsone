import { addFeature, addSeverity } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import CVLandingPage from '../../src/pages/CVLandingPage.js';
import AuthPage from '../../src/pages/AuthPage.js';
import LobbyPage from '../../src/pages/LobbyPage.js';
import GamePage from '../../src/pages/GamePage.js';
import HistoryPage from '../../src/pages/HistoryPage.js';

describe('Smoke — Critical path E2E', () => {
  const email = uniqueEmail();
  const password = DEFAULT_PASSWORD;

  before(() => {
    addFeature('Smoke');
    addSeverity('blocker');
  });

  it('should load the CV landing page', async () => {
    await CVLandingPage.open();
    expect(await CVLandingPage.isDisplayed()).toBe(true);
  });

  it('should navigate from CV landing to auth', async () => {
    await CVLandingPage.clickSlotsButton();
    await AuthPage.waitForPageLoad();
    expect(await AuthPage.isDisplayed()).toBe(true);
  });

  it('should register a new user', async () => {
    await AuthPage.openRegister();
    await AuthPage.register(email, password);

    // Should redirect to lobby after successful registration
    await LobbyPage.waitForPageLoad();
    expect(await LobbyPage.isDisplayed()).toBe(true);
  });

  it('should display games in the lobby', async () => {
    await LobbyPage.waitForGamesLoaded();
    const cardCount = await LobbyPage.getGameCardCount();
    expect(cardCount).toBeGreaterThan(0);
  });

  it('should open Mega Fortune slot game', async () => {
    await LobbyPage.openGameByTitle('Mega Fortune');
    await GamePage.waitForGameReady();
    expect(await GamePage.isDisplayed()).toBe(true);
  });

  it('should display a non-zero balance', async () => {
    const balance = await GamePage.getBalanceNumber();
    expect(balance).toBeGreaterThan(0);
  });

  it('should perform a spin and get a result', async () => {
    const balanceBefore = await GamePage.getBalanceNumber();
    const result = await GamePage.spinAndWaitForResult();

    // Either win or no-win — just verify we got a result
    expect(typeof result.won).toBe('boolean');

    // Balance should have changed (bet deducted, maybe win added)
    const balanceAfter = await GamePage.getBalanceNumber();
    expect(balanceAfter).not.toBe(balanceBefore);
  });

  it('should navigate to game history', async () => {
    await GamePage.tapHistoryButton();
    await HistoryPage.waitForPageLoad();
    expect(await HistoryPage.isDisplayed()).toBe(true);
  });

  it('should display at least one history entry', async () => {
    const rowCount = await HistoryPage.getRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  it('should navigate back to the game via back button', async () => {
    await HistoryPage.tapBack();
    await GamePage.waitForPageLoad();
    expect(await GamePage.isDisplayed()).toBe(true);
  });
});
