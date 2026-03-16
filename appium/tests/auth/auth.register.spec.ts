import { addFeature, addSeverity } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import AuthPage from '../../src/pages/AuthPage.js';
import LobbyPage from '../../src/pages/LobbyPage.js';

describe('Auth — Registration', () => {
  before(() => {
    addFeature('Authentication');
    addSeverity('critical');
  });

  it('should display the registration form with age checkbox', async () => {
    await AuthPage.openRegister();
    expect(await AuthPage.isDisplayed()).toBe(true);
    expect(await AuthPage.isAgeCheckboxVisible()).toBe(true);
  });

  it('should show age confirmation checkbox only on register tab', async () => {
    expect(await AuthPage.isAgeCheckboxVisible()).toBe(true);

    await AuthPage.switchToLoginTab();
    expect(await AuthPage.isAgeCheckboxVisible()).toBe(false);

    await AuthPage.switchToRegisterTab();
    expect(await AuthPage.isAgeCheckboxVisible()).toBe(true);
  });

  it('should switch to login tab and back', async () => {
    await AuthPage.switchToLoginTab();
    const loginTab = await AuthPage.getActiveTabText();
    expect(loginTab.toLowerCase()).toContain('login');

    await AuthPage.switchToRegisterTab();
    const registerTab = await AuthPage.getActiveTabText();
    expect(registerTab.toLowerCase()).toContain('register');
  });

  it('should show error when registering with existing email', async () => {
    const email = uniqueEmail();

    // Register first time
    await AuthPage.openRegister();
    await AuthPage.register(email, DEFAULT_PASSWORD);
    await LobbyPage.waitForPageLoad();

    // Try registering again with same email
    await AuthPage.openRegister();
    await AuthPage.register(email, DEFAULT_PASSWORD);
    await browser.pause(1000);
    expect(await AuthPage.isErrorDisplayed()).toBe(true);
  });

  // This test redirects to lobby — keep it last
  it('should register a new user successfully', async () => {
    const email = uniqueEmail();
    await AuthPage.openRegister();
    await AuthPage.register(email, DEFAULT_PASSWORD);

    await LobbyPage.waitForPageLoad();
    expect(await LobbyPage.isDisplayed()).toBe(true);
  });
});
