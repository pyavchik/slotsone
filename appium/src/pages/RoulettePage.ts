import { BasePage } from './BasePage.js';
import { TEST_CONFIG } from '../data/test-config.js';

class RoulettePage extends BasePage {
  get pageSelector() {
    return '.rp-shell';
  }

  // Selectors
  private get wheelArea() { return '.rp-wheel-area'; }
  private get tabs() { return '.rp-tab'; }
  private get error() { return '.rp-error'; }
  private get gameArea() { return '.rp-game'; }
  private get loadingSpinner() { return '.rp-loading-spinner'; }

  async open(): Promise<void> {
    await super.open(TEST_CONFIG.paths.europeanRoulette);
  }

  async waitForGameReady(): Promise<void> {
    await this.waitForElement(this.gameArea);
  }

  async isWheelAreaDisplayed(): Promise<boolean> {
    return await this.isElementDisplayed(this.wheelArea);
  }

  async isErrorDisplayed(): Promise<boolean> {
    return await this.isElementDisplayed(this.error);
  }

  async getErrorText(): Promise<string> {
    return await this.getText(this.error);
  }

  async getTabs(): Promise<string[]> {
    const tabEls = await $$(this.tabs);
    const results: string[] = [];
    for (const tab of tabEls) {
      results.push(await tab.getText());
    }
    return results;
  }

  async selectTab(name: string): Promise<void> {
    const tabEls = await $$(this.tabs);
    for (const tab of tabEls) {
      const text = await tab.getText();
      if (text.toLowerCase().includes(name.toLowerCase())) {
        await tab.click();
        return;
      }
    }
    throw new Error(`Roulette tab "${name}" not found`);
  }

  async isLoading(): Promise<boolean> {
    return await this.isElementDisplayed(this.loadingSpinner);
  }
}

export default new RoulettePage();
