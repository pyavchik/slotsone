import { BasePage } from './BasePage.js';
import { TEST_CONFIG } from '../data/test-config.js';

class HistoryPage extends BasePage {
  get pageSelector() {
    return '.gh-page';
  }

  // Selectors
  private get backButton() { return '.gh-back-btn'; }
  private get title() { return '.gh-title'; }
  private get summaryCards() { return '.gh-summary-card'; }
  private get filtersToggle() { return '.gh-filters-toggle'; }
  private get filtersSection() { return '.gh-filters'; }
  private get filterSelect() { return '.gh-filter-select'; }
  private get applyFiltersButton() { return '.gh-filter-apply'; }
  private get clearFiltersButton() { return '.gh-filter-clear'; }
  private get historyTable() { return '.gh-table'; }
  private get detailLinks() { return '.gh-detail-link'; }
  private get paginationSection() { return '.gh-pagination'; }

  async open(): Promise<void> {
    await super.open(TEST_CONFIG.paths.history);
  }

  // --- Navigation ---

  async tapBack(): Promise<void> {
    await this.tap(this.backButton);
  }

  async getTitle(): Promise<string> {
    return await this.getText(this.title);
  }

  // --- Summary ---

  async getSummaryCardCount(): Promise<number> {
    const cards = await $$(this.summaryCards);
    return await cards.length;
  }

  async getSummaryCardTexts(): Promise<string[]> {
    const cards = await $$(this.summaryCards);
    const results: string[] = [];
    for (const c of cards) {
      results.push(await c.getText());
    }
    return results;
  }

  // --- Filters ---

  async toggleFilters(): Promise<void> {
    await this.tap(this.filtersToggle);
  }

  async isFiltersVisible(): Promise<boolean> {
    return await this.isElementDisplayed(this.filtersSection);
  }

  async selectResultFilter(value: string): Promise<void> {
    const select = await $(this.filterSelect);
    await select.selectByVisibleText(value);
  }

  async applyFilters(): Promise<void> {
    await this.tap(this.applyFiltersButton);
  }

  async clearFilters(): Promise<void> {
    await this.tap(this.clearFiltersButton);
  }

  // --- Table ---

  async isTableDisplayed(): Promise<boolean> {
    return await this.isElementDisplayed(this.historyTable);
  }

  async getRowCount(): Promise<number> {
    const rows = await $$(`${this.historyTable} tbody tr`);
    return await rows.length;
  }

  async tapDetailLink(index = 0): Promise<void> {
    const links = await $$(this.detailLinks);
    const len = await links.length;
    if (len > index) {
      await links[index].scrollIntoView();
      await links[index].click();
    } else {
      throw new Error(`Detail link at index ${index} not found`);
    }
  }

  // --- Pagination ---

  async isPaginationVisible(): Promise<boolean> {
    return await this.isElementDisplayed(this.paginationSection);
  }

  async tapNextPage(): Promise<void> {
    const buttons = await $$(`${this.paginationSection} button`);
    const len = await buttons.length;
    if (len > 0) {
      await buttons[len - 1].click();
    }
  }

  async tapPrevPage(): Promise<void> {
    const buttons = await $$(`${this.paginationSection} button`);
    const len = await buttons.length;
    if (len > 0) {
      await buttons[0].click();
    }
  }
}

export default new HistoryPage();
