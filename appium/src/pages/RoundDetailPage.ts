import { BasePage } from './BasePage.js';

class RoundDetailPage extends BasePage {
  get pageSelector() {
    return '.rd-page';
  }

  // Selectors
  private get backButton() { return '.rd-back-btn'; }
  private get title() { return '.rd-title'; }
  private get reelGrid() { return '.rd-reel-grid'; }
  private get reelCells() { return '.rd-reel-cell'; }
  private get winCells() { return '.rd-reel-cell--win'; }
  private get financeGrid() { return '.rd-finance-grid'; }
  private get financeItems() { return '.rd-finance-item'; }
  private get transactionList() { return '.rd-txn-list'; }
  private get provablyFairToggle() { return '.rd-pf-toggle'; }
  private get provablyFairRows() { return '.rd-pf-row'; }
  private get verifyButton() { return '.rd-pf-verify-btn'; }
  private get verifyResult() { return '.rd-pf-result'; }

  // --- Navigation ---

  async tapBack(): Promise<void> {
    await this.tap(this.backButton);
  }

  async getTitle(): Promise<string> {
    return await this.getText(this.title);
  }

  // --- Reel grid ---

  async isReelGridDisplayed(): Promise<boolean> {
    return await this.isElementDisplayed(this.reelGrid);
  }

  async getReelCellCount(): Promise<number> {
    const cells = await $$(this.reelCells);
    return await cells.length;
  }

  async getWinCellCount(): Promise<number> {
    const cells = await $$(this.winCells);
    return await cells.length;
  }

  // --- Financials ---

  async isFinanceGridDisplayed(): Promise<boolean> {
    return await this.isElementDisplayed(this.financeGrid);
  }

  async getFinanceItems(): Promise<string[]> {
    const items = await $$(this.financeItems);
    const results: string[] = [];
    for (const item of items) {
      results.push(await item.getText());
    }
    return results;
  }

  async isTransactionListDisplayed(): Promise<boolean> {
    return await this.isElementDisplayed(this.transactionList);
  }

  // --- Provably Fair ---

  async toggleProvablyFair(): Promise<void> {
    await this.scrollTo(this.provablyFairToggle);
    await this.tap(this.provablyFairToggle);
  }

  async isProvablyFairVisible(): Promise<boolean> {
    const rows = await $$(this.provablyFairRows);
    return (await rows.length) > 0;
  }

  async tapVerify(): Promise<void> {
    await this.waitForElement(this.verifyButton);
    await this.scrollTo(this.verifyButton);
    await this.tap(this.verifyButton);
  }

  async getVerifyResult(): Promise<string> {
    const result = await $(this.verifyResult);
    await result.waitForDisplayed({ timeout: 5000 });
    return await result.getText();
  }

  async isVerifyPass(): Promise<boolean> {
    const result = await $(this.verifyResult);
    const className = await result.getAttribute('class');
    return className !== null && className.includes('rd-pf-result--pass');
  }
}

export default new RoundDetailPage();
