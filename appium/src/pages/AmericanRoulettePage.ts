import { BasePage } from './BasePage.js';
import { TEST_CONFIG } from '../data/test-config.js';

class AmericanRoulettePage extends BasePage {
  get pageSelector() {
    return '.ar-page';
  }

  // Selectors
  private get hudItems() { return '.ar-hud-item'; }
  private get bettingTable() { return '[aria-label="American roulette betting table"]'; }
  private get spinButton() { return '.ar-spin'; }
  private get lobbyButton() { return '.ar-lobby-btn'; }
  private get resultDisplay() { return '.ar-result'; }
  private get historyItems() { return '.ar-history-item'; }
  private get numberCells() { return '.ar-number'; }
  private get outsideBets() { return '.ar-outside'; }
  private get toastStack() { return '.ar-toast-stack'; }

  async open(): Promise<void> {
    await super.open(TEST_CONFIG.paths.americanRoulette);
  }

  async waitForGameReady(): Promise<void> {
    await this.waitForElement(this.bettingTable);
  }

  // --- HUD ---

  async getHudValues(): Promise<string[]> {
    const items = await $$(this.hudItems);
    const results: string[] = [];
    for (const item of items) {
      results.push(await item.getText());
    }
    return results;
  }

  // --- Betting ---

  async isBettingTableDisplayed(): Promise<boolean> {
    return await this.isElementDisplayed(this.bettingTable);
  }

  async selectChip(value: number): Promise<void> {
    const chip = await $(`[aria-label="${value} chip"]`);
    await chip.click();
  }

  async placeBetOnNumber(number: number): Promise<void> {
    const cells = await $$(this.numberCells);
    for (const cell of cells) {
      const text = await cell.getText();
      if (text.trim() === String(number)) {
        await cell.click();
        return;
      }
    }
    throw new Error(`Number cell ${number} not found`);
  }

  async placeBetOnOutside(label: string): Promise<void> {
    const cells = await $$(this.outsideBets);
    for (const cell of cells) {
      const text = await cell.getText();
      if (text.toLowerCase().includes(label.toLowerCase())) {
        await cell.click();
        return;
      }
    }
    throw new Error(`Outside bet "${label}" not found`);
  }

  // --- Spin ---

  async tapSpin(): Promise<void> {
    await this.tap(this.spinButton);
  }

  async isSpinDisabled(): Promise<boolean> {
    const btn = await $(this.spinButton);
    const disabled = await btn.getAttribute('disabled');
    return disabled !== null;
  }

  async waitForSpinResult(timeout = TEST_CONFIG.timeouts.spin): Promise<void> {
    await browser.waitUntil(
      async () => {
        const result = await $(this.resultDisplay);
        const text = await result.getText();
        return text.length > 0;
      },
      { timeout, timeoutMsg: 'Roulette spin result did not appear' },
    );
  }

  async getResult(): Promise<string> {
    return await this.getText(this.resultDisplay);
  }

  // --- Navigation ---

  async tapLobby(): Promise<void> {
    await this.tap(this.lobbyButton);
  }

  // --- History ---

  async getHistoryCount(): Promise<number> {
    const items = await $$(this.historyItems);
    return await items.length;
  }

  // --- Toasts ---

  async isToastDisplayed(): Promise<boolean> {
    const stack = await $(this.toastStack);
    const text = await stack.getText();
    return text.trim().length > 0;
  }
}

export default new AmericanRoulettePage();
