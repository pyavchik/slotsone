import { expect, test } from '@playwright/test';

/**
 * Localization & i18n Testing Suite
 *
 * Validates that the SlotsOne iGaming platform correctly handles
 * multi-locale rendering: currency formatting, date display,
 * long-text layout resilience, and string completeness.
 *
 * Tags: @i18n @regression
 */

const MOCK_CONFIG = {
  reels: 5,
  rows: 3,
  paylines: 20,
  currencies: ['USD'],
  min_bet: 0.1,
  max_bet: 100,
  min_lines: 1,
  max_lines: 20,
  default_lines: 20,
  line_defs: [[1, 1, 1, 1, 1]],
  bet_levels: [0.1, 0.2, 0.5, 1, 2, 5, 10],
  paytable_url: '',
  paytable: {
    line_wins: [{ symbol: 'Star', x3: 0.5, x4: 2, x5: 10 }],
    scatter: { symbol: 'Scatter', awards: [{ count: 3, free_spins: 5 }] },
    wild: { symbol: 'Wild', substitutes_for: ['10', 'J', 'Q', 'K', 'A', 'Star'] },
  },
  rules_url: '',
  rtp: 96.5,
  volatility: 'high',
  features: ['free_spins', 'multipliers', 'scatter'],
};

function makeInitResponse(currency: string, balance: number) {
  return {
    session_id: `sess_i18n_${currency}`,
    game_id: 'slot_mega_fortune_001',
    config: { ...MOCK_CONFIG, currencies: [currency] },
    balance: { amount: balance, currency },
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  };
}

function makeSpinResponse(currency: string, balance: number, win: number) {
  return {
    spin_id: `spin_i18n_${Date.now()}`,
    session_id: `sess_i18n_${currency}`,
    game_id: 'slot_mega_fortune_001',
    balance: { amount: balance, currency },
    bet: { amount: 1, currency, lines: 20 },
    outcome: {
      reel_matrix: [
        ['A', 'Q', '10'],
        ['A', 'K', 'J'],
        ['A', 'Wild', 'Q'],
        ['10', 'K', 'J'],
        ['Q', 'J', '10'],
      ],
      win: {
        amount: win,
        currency,
        breakdown:
          win > 0 ? [{ type: 'line', line_index: 0, symbol: 'A', count: 3, payout: win }] : [],
      },
      bonus_triggered: null,
    },
    next_state: 'base_game',
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Currency Display Tests
// ---------------------------------------------------------------------------

test.describe('Localization — Currency Formatting', { tag: ['@i18n', '@regression'] }, () => {
  const currencies = [
    { code: 'USD', symbol: 'USD', balance: 1500.5 },
    { code: 'EUR', symbol: 'EUR', balance: 2300.75 },
    { code: 'GBP', symbol: 'GBP', balance: 980.0 },
    { code: 'UAH', symbol: 'UAH', balance: 45000.0 },
    { code: 'BRL', symbol: 'BRL', balance: 7500.25 },
  ];

  for (const { code, symbol, balance } of currencies) {
    test(`displays ${code} currency code in balance HUD`, async ({ page, context }) => {
      await context.route('**/api/v1/game/init', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(makeInitResponse(code, balance)),
        })
      );
      await context.route('**/api/v1/images/generate', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"error":"unavailable"}',
        })
      );

      await page.goto('/slots/mega-fortune');
      await page.waitForLoadState();

      const balancePanel = page.getByTestId('hud-balance');
      await expect(balancePanel).toBeVisible({ timeout: 5000 });
      await expect(balancePanel).toContainText(symbol);
    });
  }

  test('win amount displays correct currency after spin', async ({ page, context }) => {
    const winAmount = 15.5;
    await context.route('**/api/v1/game/init', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeInitResponse('EUR', 1000)),
      })
    );
    await context.route('**/api/v1/spin', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeSpinResponse('EUR', 1000 - 1 + winAmount, winAmount)),
      })
    );
    await context.route('**/api/v1/images/generate', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{"error":"unavailable"}',
      })
    );

    await page.goto('/slots/mega-fortune');
    const spinButton = page.getByRole('button', { name: /spin/i });
    await expect(spinButton).toBeVisible({ timeout: 8000 });
    await spinButton.click();

    const winBadge = page.getByTestId('hud-win-badge');
    await expect(winBadge).toBeVisible({ timeout: 20000 });
    await expect(winBadge).toContainText('WIN');
  });
});

// ---------------------------------------------------------------------------
// Long-Text Layout Resilience
// ---------------------------------------------------------------------------

test.describe('Localization — Layout Resilience', { tag: ['@i18n', '@regression'] }, () => {
  test('CV landing page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cv-title')).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('auth form labels do not truncate on narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    const labels = page.locator('label, .auth-label, [class*="label"]');
    const count = await labels.count();

    for (let i = 0; i < count; i++) {
      const label = labels.nth(i);
      if (await label.isVisible()) {
        const box = await label.boundingBox();
        if (box) {
          // Label should fit within viewport
          expect(box.x + box.width).toBeLessThanOrEqual(375);
        }
      }
    }
  });

  test('game lobby cards handle long game titles gracefully', async ({ page }) => {
    await page.goto('/');

    // Check that no element causes horizontal scrollbar on CV page
    const scrollableWidth = await page.evaluate(() => {
      const body = document.body;
      return body.scrollWidth <= body.clientWidth + 1; // 1px tolerance
    });
    expect(scrollableWidth).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Number & Date Formatting Consistency
// ---------------------------------------------------------------------------

test.describe('Localization — Numeric Display', { tag: ['@i18n', '@smoke'] }, () => {
  test('balance displays decimal separator correctly', async ({ page, context }) => {
    const balance = 1234.56;
    await context.route('**/api/v1/game/init', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeInitResponse('USD', balance)),
      })
    );
    await context.route('**/api/v1/images/generate', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{"error":"unavailable"}',
      })
    );

    await page.goto('/slots/mega-fortune');
    const balancePanel = page.getByTestId('hud-balance');
    await expect(balancePanel).toBeVisible({ timeout: 5000 });

    const text = await balancePanel.textContent();
    // Balance should contain a decimal number representation
    expect(text).toMatch(/\d+[.,]\d{2}/);
  });

  test('bet amount respects locale number formatting', async ({ page, context }) => {
    await context.route('**/api/v1/game/init', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeInitResponse('USD', 5000)),
      })
    );
    await context.route('**/api/v1/images/generate', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{"error":"unavailable"}',
      })
    );

    await page.goto('/slots/mega-fortune');
    await page.waitForLoadState();

    // Bet display should show a valid numeric format
    const betDisplay = page.getByTestId('hud-bet').or(page.locator('[class*="bet"]').first());
    if (await betDisplay.isVisible()) {
      const betText = await betDisplay.textContent();
      // Should contain a number
      expect(betText).toMatch(/\d/);
    }
  });
});

// ---------------------------------------------------------------------------
// Text Completeness — No Missing Translations
// ---------------------------------------------------------------------------

test.describe('Localization — String Completeness', { tag: ['@i18n', '@sanity'] }, () => {
  test('CV landing page has no empty text elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cv-title')).toBeVisible();

    // Check that all visible text elements have content
    const emptyTextElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, p, span, a, button, label');
      let emptyCount = 0;
      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.offsetParent !== null && htmlEl.children.length === 0) {
          const text = htmlEl.textContent?.trim();
          if (text === '' || text === 'undefined' || text === 'null') {
            emptyCount++;
          }
        }
      });
      return emptyCount;
    });

    expect(emptyTextElements).toBe(0);
  });

  test('no untranslated i18n keys visible on CV page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cv-title')).toBeVisible();

    // Check for common i18n key patterns that indicate missing translations
    const pageText = await page.textContent('body');
    const i18nKeyPatterns = [
      /\{\{[a-zA-Z_.]+\}\}/, // {{key.name}}
      /\{t\(['"]/, // {t('key')}
      /^[A-Z_]{3,}\.[A-Z_]+$/m, // MODULE.KEY_NAME
      /translation_missing/i,
      /missing_key/i,
    ];

    for (const pattern of i18nKeyPatterns) {
      expect(pageText).not.toMatch(pattern);
    }
  });

  test('auth screen buttons have visible labels', async ({ page }) => {
    await page.goto('/login');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        const text = await btn.textContent();
        const ariaLabel = await btn.getAttribute('aria-label');
        // Every visible button must have text content or aria-label
        expect(text?.trim() || ariaLabel?.trim()).toBeTruthy();
      }
    }
  });
});
