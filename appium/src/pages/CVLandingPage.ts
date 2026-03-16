import { BasePage } from './BasePage.js';
import { TEST_CONFIG } from '../data/test-config.js';

class CVLandingPage extends BasePage {
  get pageSelector() {
    return '[data-testid="cv-title"]';
  }

  // Selectors
  private get slotsButton() { return '[data-testid="cv-open-slots"]'; }
  private get requirementsLink() { return '[data-testid="cv-requirements"]'; }
  private get testCasesLink() { return '[data-testid="cv-test-cases"]'; }
  private get sqlLink() { return '[data-testid="cv-sql"]'; }
  private get testDesignLink() { return '[data-testid="cv-test-design"]'; }

  async open(): Promise<void> {
    await super.open(TEST_CONFIG.paths.landing);
  }

  async clickSlotsButton(): Promise<void> {
    // There are multiple "cv-open-slots" buttons (header + footer); click the first
    const buttons = await $$(this.slotsButton);
    const len = await buttons.length;
    if (len > 0) {
      await buttons[0].scrollIntoView();
      await buttons[0].click();
    }
  }

  async getTitle(): Promise<string> {
    return await this.getText(this.pageSelector);
  }

  async isRequirementsLinkVisible(): Promise<boolean> {
    return await this.isElementDisplayed(this.requirementsLink);
  }

  async isTestCasesLinkVisible(): Promise<boolean> {
    return await this.isElementDisplayed(this.testCasesLink);
  }

  async isSqlLinkVisible(): Promise<boolean> {
    return await this.isElementDisplayed(this.sqlLink);
  }

  async isTestDesignLinkVisible(): Promise<boolean> {
    return await this.isElementDisplayed(this.testDesignLink);
  }
}

export default new CVLandingPage();
