import { TEST_CONFIG } from '../data/test-config.js';
import { dismissKeyboard, scrollIntoView } from '../helpers/browser.helper.js';

export abstract class BasePage {
  abstract get pageSelector(): string;

  async open(path: string): Promise<void> {
    await browser.url(TEST_CONFIG.baseUrl + path);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(timeout = TEST_CONFIG.timeouts.pageLoad): Promise<void> {
    const el = await $(this.pageSelector);
    await el.waitForDisplayed({ timeout });
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const el = await $(this.pageSelector);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }

  async tap(selector: string): Promise<void> {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout: TEST_CONFIG.timeouts.element });
    await el.scrollIntoView();
    await el.click();
  }

  async setText(selector: string, value: string): Promise<void> {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout: TEST_CONFIG.timeouts.element });
    await el.scrollIntoView();
    await el.clearValue();
    await el.setValue(value);
    await dismissKeyboard();
  }

  async getText(selector: string): Promise<string> {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout: TEST_CONFIG.timeouts.element });
    return await el.getText();
  }

  async waitForElement(
    selector: string,
    timeout = TEST_CONFIG.timeouts.element,
  ): Promise<void> {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
  }

  async waitForElementGone(
    selector: string,
    timeout = TEST_CONFIG.timeouts.element,
  ): Promise<void> {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout, reverse: true });
  }

  async scrollTo(selector: string): Promise<void> {
    await scrollIntoView(selector);
  }

  async getElementAttribute(selector: string, attr: string): Promise<string | null> {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout: TEST_CONFIG.timeouts.element });
    return await el.getAttribute(attr);
  }

  async isElementDisplayed(selector: string): Promise<boolean> {
    try {
      const el = await $(selector);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }

  async waitForUrl(
    urlPattern: string | RegExp,
    timeout = TEST_CONFIG.timeouts.navigation,
  ): Promise<void> {
    await browser.waitUntil(
      async () => {
        const url = await browser.getUrl();
        return typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);
      },
      { timeout, timeoutMsg: `URL did not match ${urlPattern}` },
    );
  }
}
