import { BasePage } from './BasePage.js';
import { TEST_CONFIG } from '../data/test-config.js';

class LobbyPage extends BasePage {
  get pageSelector() {
    return '.lobby-page';
  }

  // Selectors
  private get categoryTabs() { return '.lobby-nav-tab'; }
  private get searchInput() { return '.filters-search-input'; }
  private get searchClear() { return '.filters-search-clear'; }
  private get clearAllFilters() { return '.filters-clear-all'; }
  private get gameGrid() { return '.game-grid'; }
  private get gameCards() { return '.game-card'; }
  private get gameCardTitles() { return '.game-card-title'; }
  private get balancePill() { return '.lobby-balance-pill'; }
  private get userMenuButton() { return '.lobby-user-btn'; }

  async open(): Promise<void> {
    await super.open(TEST_CONFIG.paths.lobby);
  }

  async waitForGamesLoaded(): Promise<void> {
    await this.waitForElement(this.gameGrid);
  }

  // --- Category tabs ---

  async getCategoryTabs(): Promise<string[]> {
    const tabs = await $$(this.categoryTabs);
    const results: string[] = [];
    for (const tab of tabs) {
      results.push(await tab.getText());
    }
    return results;
  }

  async selectCategory(name: string): Promise<void> {
    const tabs = await $$(this.categoryTabs);
    for (const tab of tabs) {
      const text = await tab.getText();
      if (text.toLowerCase().includes(name.toLowerCase())) {
        await tab.click();
        return;
      }
    }
    throw new Error(`Category tab "${name}" not found`);
  }

  async getActiveCategoryTab(): Promise<string> {
    const tab = await $('.lobby-nav-tab--active');
    return await tab.getText();
  }

  // --- Search & filters ---

  async searchGame(query: string): Promise<void> {
    await this.setText(this.searchInput, query);
  }

  async clearSearch(): Promise<void> {
    const clearBtn = await $(this.searchClear);
    if (await clearBtn.isDisplayed()) {
      await clearBtn.click();
    }
  }

  async clearAllFiltersClick(): Promise<void> {
    await this.tap(this.clearAllFilters);
  }

  async selectProviderFilter(provider: string): Promise<void> {
    const selects = await $$('.filters-select');
    const len = await selects.length;
    if (len > 0) {
      await selects[0].selectByVisibleText(provider);
    }
  }

  async selectVolatilityFilter(volatility: string): Promise<void> {
    const selects = await $$('.filters-select');
    const len = await selects.length;
    if (len > 1) {
      await selects[1].selectByVisibleText(volatility);
    }
  }

  async selectSort(sortOption: string): Promise<void> {
    const selects = await $$('.filters-select');
    const len = await selects.length;
    if (len > 2) {
      await selects[2].selectByVisibleText(sortOption);
    }
  }

  // --- Game cards ---

  async getGameCardCount(): Promise<number> {
    const cards = await $$(this.gameCards);
    return await cards.length;
  }

  async getGameCardTitles(): Promise<string[]> {
    const titles = await $$(this.gameCardTitles);
    const results: string[] = [];
    for (const t of titles) {
      results.push(await t.getText());
    }
    return results;
  }

  async openGameByTitle(title: string): Promise<void> {
    const cards = await $$(this.gameCards);
    for (const card of cards) {
      const titleEl = await card.$('.game-card-title');
      const text = await titleEl.getText();
      if (text.toLowerCase().includes(title.toLowerCase())) {
        await card.scrollIntoView();
        await card.click();
        return;
      }
    }
    throw new Error(`Game card "${title}" not found`);
  }

  async isGameCardComingSoon(title: string): Promise<boolean> {
    const cards = await $$(this.gameCards);
    for (const card of cards) {
      const titleEl = await card.$('.game-card-title');
      const text = await titleEl.getText();
      if (text.toLowerCase().includes(title.toLowerCase())) {
        const btn = await card.$('.game-card-play-btn');
        const btnText = await btn.getText();
        return btnText.toLowerCase().includes('coming soon');
      }
    }
    return false;
  }

  // --- Header ---

  async getBalance(): Promise<string> {
    return await this.getText(this.balancePill);
  }

  async openUserMenu(): Promise<void> {
    await this.tap(this.userMenuButton);
  }
}

export default new LobbyPage();
