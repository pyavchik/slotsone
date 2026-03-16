import { BasePage } from './BasePage.js';
import { TEST_CONFIG } from '../data/test-config.js';
import { dismissKeyboard } from '../helpers/browser.helper.js';

class AuthPage extends BasePage {
  get pageSelector() {
    return '.auth-shell';
  }

  // Selectors
  private get emailInput() { return '#auth-email'; }
  private get passwordInput() { return '#auth-password'; }
  private get ageCheckbox() { return '#auth-age'; }
  private get submitButton() { return '.auth-submit'; }
  private get errorAlert() { return '[role="alert"].auth-error'; }
  private get tabs() { return '.auth-tab'; }

  async openLogin(): Promise<void> {
    await super.open(TEST_CONFIG.paths.login);
  }

  async openRegister(): Promise<void> {
    await super.open(TEST_CONFIG.paths.register);
  }

  async switchToLoginTab(): Promise<void> {
    const allTabs = await $$(this.tabs);
    const len = await allTabs.length;
    if (len >= 1) {
      await allTabs[0].click();
    }
  }

  async switchToRegisterTab(): Promise<void> {
    const allTabs = await $$(this.tabs);
    const len = await allTabs.length;
    if (len >= 2) {
      await allTabs[1].click();
    }
  }

  async enterEmail(email: string): Promise<void> {
    await this.setText(this.emailInput, email);
  }

  async enterPassword(password: string): Promise<void> {
    await this.setText(this.passwordInput, password);
  }

  async checkAgeConfirmation(): Promise<void> {
    const checkbox = await $(this.ageCheckbox);
    await checkbox.waitForDisplayed({ timeout: TEST_CONFIG.timeouts.element });
    await checkbox.scrollIntoView();
    const isSelected = await checkbox.isSelected();
    if (!isSelected) {
      await checkbox.click();
    }
  }

  async tapSubmit(): Promise<void> {
    await dismissKeyboard();
    await this.tap(this.submitButton);
  }

  async login(email: string, password: string): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.tapSubmit();
  }

  async register(email: string, password: string): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.checkAgeConfirmation();
    await this.tapSubmit();
  }

  async getErrorMessage(): Promise<string> {
    const el = await $(this.errorAlert);
    await el.waitForDisplayed({ timeout: TEST_CONFIG.timeouts.element });
    return await el.getText();
  }

  async isErrorDisplayed(): Promise<boolean> {
    return await this.isElementDisplayed(this.errorAlert);
  }

  async isSubmitDisabled(): Promise<boolean> {
    const btn = await $(this.submitButton);
    const disabled = await btn.getAttribute('disabled');
    return disabled !== null;
  }

  async isAgeCheckboxVisible(): Promise<boolean> {
    return await this.isElementDisplayed(this.ageCheckbox);
  }

  async getActiveTabText(): Promise<string> {
    const tab = await $('[role="tab"][aria-selected="true"]');
    return await tab.getText();
  }
}

export default new AuthPage();
