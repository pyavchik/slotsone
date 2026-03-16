import { BasePage } from './BasePage.js';
import { TEST_CONFIG } from '../data/test-config.js';
import { getReelState, isCanvasRendered } from '../helpers/canvas.helper.js';

class GamePage extends BasePage {
  get pageSelector() {
    return '.slots-shell';
  }

  // HUD selectors
  private get hudBalance() { return '[data-testid="hud-balance"]'; }
  private get hudWinBadge() { return '[data-testid="hud-win-badge"]'; }
  private get hudNoWinBadge() { return '[data-testid="hud-nowin-badge"]'; }
  private get hudActionButtons() { return '.hud-action-btn'; }

  // Bet panel selectors
  private get spinButton() { return '.spin-button'; }
  private get betValue() { return '.bet-value'; }
  private get betAdjustButtons() { return '.bet-adjust'; }
  private get betQuickButtons() { return '.bet-quick'; }

  // Error
  private get errorToast() { return '.slots-error-toast'; }

  async open(slug = 'mega-fortune'): Promise<void> {
    await super.open(`/slots/${slug}`);
  }

  async waitForGameReady(): Promise<void> {
    await this.waitForElement(this.spinButton);
    await browser.waitUntil(
      async () => await isCanvasRendered(),
      {
        timeout: TEST_CONFIG.timeouts.pageLoad,
        timeoutMsg: 'Game canvas did not render',
      },
    );
  }

  // --- HUD ---

  async getBalance(): Promise<string> {
    return await this.getText(this.hudBalance);
  }

  async getBalanceNumber(): Promise<number> {
    const text = await this.getBalance();
    const match = text.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  async isWinBadgeDisplayed(): Promise<boolean> {
    return await this.isElementDisplayed(this.hudWinBadge);
  }

  async isNoWinBadgeDisplayed(): Promise<boolean> {
    return await this.isElementDisplayed(this.hudNoWinBadge);
  }

  async getWinAmount(): Promise<string> {
    return await this.getText(this.hudWinBadge);
  }

  async tapLobbyButton(): Promise<void> {
    const buttons = await $$(this.hudActionButtons);
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.toLowerCase().includes('lobby')) {
        await btn.click();
        return;
      }
    }
    throw new Error('Lobby button not found in HUD');
  }

  async tapHistoryButton(): Promise<void> {
    const buttons = await $$(this.hudActionButtons);
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.toLowerCase().includes('history')) {
        await btn.click();
        return;
      }
    }
    throw new Error('History button not found in HUD');
  }

  async tapLogoutButton(): Promise<void> {
    const buttons = await $$(this.hudActionButtons);
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.toLowerCase().includes('logout')) {
        await btn.click();
        return;
      }
    }
    throw new Error('Logout button not found in HUD');
  }

  // --- Spin ---

  async tapSpin(): Promise<void> {
    await this.tap(this.spinButton);
  }

  async waitForSpinResult(timeout = TEST_CONFIG.timeouts.spin): Promise<void> {
    await browser.waitUntil(
      async () => {
        const win = await this.isWinBadgeDisplayed();
        const noWin = await this.isNoWinBadgeDisplayed();
        return win || noWin;
      },
      { timeout, timeoutMsg: 'Spin result did not appear' },
    );
  }

  async spinAndWaitForResult(): Promise<{ won: boolean }> {
    await this.tapSpin();
    await this.waitForSpinResult();
    const won = await this.isWinBadgeDisplayed();
    return { won };
  }

  async isSpinButtonReady(): Promise<boolean> {
    const btn = await $(this.spinButton);
    const className = await btn.getAttribute('class');
    return className !== null && className.includes('spin-button-ready');
  }

  // --- Bet controls ---

  async getBetValue(): Promise<string> {
    const values = await $$(this.betValue);
    const len = await values.length;
    if (len > 0) {
      return await values[0].getText();
    }
    return '';
  }

  async getLinesValue(): Promise<string> {
    const values = await $$(this.betValue);
    const len = await values.length;
    if (len > 1) {
      return await values[1].getText();
    }
    return '';
  }

  async tapIncreaseBet(): Promise<void> {
    const buttons = await $$(this.betAdjustButtons);
    const len = await buttons.length;
    if (len >= 2) {
      await buttons[1].click();
    }
  }

  async tapDecreaseBet(): Promise<void> {
    const buttons = await $$(this.betAdjustButtons);
    const len = await buttons.length;
    if (len >= 1) {
      await buttons[0].click();
    }
  }

  async tapIncreaseLines(): Promise<void> {
    const buttons = await $$(this.betAdjustButtons);
    const len = await buttons.length;
    if (len >= 4) {
      await buttons[3].click();
    }
  }

  async tapDecreaseLines(): Promise<void> {
    const buttons = await $$(this.betAdjustButtons);
    const len = await buttons.length;
    if (len >= 3) {
      await buttons[2].click();
    }
  }

  async selectQuickBet(index: number): Promise<void> {
    const buttons = await $$(this.betQuickButtons);
    const len = await buttons.length;
    if (len > index) {
      await buttons[index].click();
    }
  }

  // --- Canvas ---

  async isCanvasVisible(): Promise<boolean> {
    return await isCanvasRendered();
  }

  async getReelState(): Promise<unknown> {
    return await getReelState();
  }

  // --- Error handling ---

  async isErrorToastDisplayed(): Promise<boolean> {
    return await this.isElementDisplayed(this.errorToast);
  }

  async getErrorToastMessage(): Promise<string> {
    return await this.getText(this.errorToast);
  }
}

export default new GamePage();
