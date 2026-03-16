import { addFeature, addSeverity } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { apiRegister } from '../../src/helpers/api.helper.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import AuthPage from '../../src/pages/AuthPage.js';
import LobbyPage from '../../src/pages/LobbyPage.js';

describe('Auth — Login', () => {
  const email = uniqueEmail();
  const password = DEFAULT_PASSWORD;

  before(async () => {
    addFeature('Authentication');
    addSeverity('critical');

    // Pre-register a user via API for login tests
    await apiRegister(email, password);
  });

  it('should display the login form', async () => {
    await AuthPage.openLogin();
    expect(await AuthPage.isDisplayed()).toBe(true);
    const activeTab = await AuthPage.getActiveTabText();
    expect(activeTab.toLowerCase()).toContain('login');
  });

  it('should not show age checkbox on login tab', async () => {
    // Already on login page from previous test
    expect(await AuthPage.isAgeCheckboxVisible()).toBe(false);
  });

  it('should switch between login and register tabs', async () => {
    await AuthPage.switchToRegisterTab();
    expect(await AuthPage.isAgeCheckboxVisible()).toBe(true);

    await AuthPage.switchToLoginTab();
    expect(await AuthPage.isAgeCheckboxVisible()).toBe(false);
  });

  it('should show error on invalid password', async () => {
    // Navigate fresh to login to reset any state
    await AuthPage.openLogin();
    await AuthPage.login(email, 'WrongPassword123!');

    // Wait a moment for the error to appear
    await browser.pause(1000);
    expect(await AuthPage.isErrorDisplayed()).toBe(true);
    const errorMsg = await AuthPage.getErrorMessage();
    expect(errorMsg.length).toBeGreaterThan(0);
  });

  it('should show error on non-existent email', async () => {
    await AuthPage.openLogin();
    await AuthPage.login('nonexistent@test.dev', password);

    await browser.pause(1000);
    expect(await AuthPage.isErrorDisplayed()).toBe(true);
  });

  it('should login with valid credentials', async () => {
    // This test is last so the redirect to lobby doesn't break subsequent beforeEach
    await AuthPage.openLogin();
    await AuthPage.login(email, password);
    await LobbyPage.waitForPageLoad();
    expect(await LobbyPage.isDisplayed()).toBe(true);
  });
});
