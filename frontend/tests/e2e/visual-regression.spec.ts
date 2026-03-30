import type { BrowserContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * Visual Regression Testing Suite
 *
 * Uses Playwright screenshot comparison to detect unintended UI changes.
 * Covers key screens across desktop and mobile viewports.
 * Screenshots are stored in tests/e2e/visual-regression.spec.ts-snapshots/.
 *
 * Tags: @visual @regression
 *
 * Note: device descriptors with defaultBrowserType cannot be used inside
 * test.describe(). Instead we use viewport/touch properties only.
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

async function stubApis(context: BrowserContext): Promise<void> {
  await context.route('**/api/v1/game/init', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: 'sess_visual_1',
        game_id: 'slot_mega_fortune_001',
        config: MOCK_CONFIG,
        balance: { amount: 1000, currency: 'USD' },
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
      }),
    })
  );
  await context.route('**/api/v1/images/generate', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' })
  );
}

// Tolerance thresholds for visual comparison
const SCREENSHOT_OPTIONS = {
  maxDiffPixelRatio: 0.05, // Allow 5% pixel difference (animated elements)
  threshold: 0.3, // Per-pixel color threshold (0-1)
  timeout: 15_000, // Longer timeout for screenshot stabilization
};

// Device viewports (without defaultBrowserType to avoid worker conflicts)
const IPHONE_SE = {
  viewport: { width: 375, height: 667 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};
const IPAD_MINI = {
  viewport: { width: 768, height: 1024 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

// ---------------------------------------------------------------------------
// Desktop Screenshots — Full Page
// ---------------------------------------------------------------------------

test.describe('Visual Regression — Desktop (1280x720)', { tag: ['@visual', '@regression'] }, () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('CV landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cv-title')).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Mask the animated Spline 3D robot to prevent screenshot instability
    const spline = page.locator('canvas[data-engine]').first();
    const mask = (await spline.isVisible().catch(() => false)) ? [spline] : [];

    await expect(page).toHaveScreenshot('desktop-cv-landing.png', {
      fullPage: true,
      mask,
      ...SCREENSHOT_OPTIONS,
    });
  });

  test('auth login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('desktop-auth-login.png', {
      ...SCREENSHOT_OPTIONS,
    });
  });

  test('auth register page', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('desktop-auth-register.png', {
      ...SCREENSHOT_OPTIONS,
    });
  });

  test('game page — initial state', async ({ page, context }) => {
    await stubApis(context);
    await page.goto('/slots/mega-fortune');
    await page.waitForLoadState();

    // Wait for game UI to stabilize
    await expect(page.getByRole('button', { name: /spin/i })).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);

    // Screenshot HUD area only (canvas is non-deterministic)
    const hud = page.getByTestId('hud-balance').locator('..');
    if (await hud.isVisible()) {
      await expect(hud).toHaveScreenshot('desktop-game-hud.png', {
        ...SCREENSHOT_OPTIONS,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Mobile Screenshots — iPhone SE
// ---------------------------------------------------------------------------

test.describe('Visual Regression — iPhone SE', { tag: ['@visual', '@regression'] }, () => {
  test.use(IPHONE_SE);

  test('CV landing page — mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cv-title')).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Mask the animated Spline 3D robot to prevent screenshot instability
    const spline = page.locator('canvas[data-engine]').first();
    const mask = (await spline.isVisible().catch(() => false)) ? [spline] : [];

    await expect(page).toHaveScreenshot('mobile-cv-landing.png', {
      fullPage: true,
      mask,
      ...SCREENSHOT_OPTIONS,
    });
  });

  test('auth login page — mobile', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('mobile-auth-login.png', {
      ...SCREENSHOT_OPTIONS,
    });
  });
});

// ---------------------------------------------------------------------------
// Tablet Screenshots — iPad
// ---------------------------------------------------------------------------

test.describe('Visual Regression — iPad', { tag: ['@visual', '@regression'] }, () => {
  test.use(IPAD_MINI);

  test('CV landing page — tablet', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cv-title')).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Hide the Spline 3D robot entirely — its WebGL animation prevents stabilization
    await page.evaluate(() => {
      document.querySelectorAll('canvas').forEach((c) => (c.style.visibility = 'hidden'));
    });

    await expect(page).toHaveScreenshot('tablet-cv-landing.png', {
      fullPage: true,
      ...SCREENSHOT_OPTIONS,
    });
  });
});

// ---------------------------------------------------------------------------
// Component-Level Visual Tests
// ---------------------------------------------------------------------------

test.describe('Visual Regression — Components', { tag: ['@visual', '@sanity'] }, () => {
  test('CV action bar renders consistently', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cv-title')).toBeVisible();

    const actionsBar = page.locator('.cv-actions').first();
    await expect(actionsBar).toBeVisible();

    await expect(actionsBar).toHaveScreenshot('component-cv-actions.png', {
      ...SCREENSHOT_OPTIONS,
    });
  });

  test('auth form component renders consistently', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const form = page.locator('form').first();
    if (await form.isVisible()) {
      await expect(form).toHaveScreenshot('component-auth-form.png', {
        ...SCREENSHOT_OPTIONS,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Dark Theme Consistency
// ---------------------------------------------------------------------------

test.describe('Visual Regression — Theme', { tag: ['@visual', '@regression'] }, () => {
  test('prefers dark color scheme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.getByTestId('cv-title')).toBeVisible();
    await page.waitForLoadState('networkidle');

    const spline = page.locator('canvas[data-engine]').first();
    const mask = (await spline.isVisible().catch(() => false)) ? [spline] : [];

    await expect(page).toHaveScreenshot('theme-dark-cv.png', {
      fullPage: true,
      mask,
      ...SCREENSHOT_OPTIONS,
    });
  });

  test('prefers light color scheme fallback', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.getByTestId('cv-title')).toBeVisible();
    await page.waitForLoadState('networkidle');

    const spline = page.locator('canvas[data-engine]').first();
    const mask = (await spline.isVisible().catch(() => false)) ? [spline] : [];

    await expect(page).toHaveScreenshot('theme-light-cv.png', {
      fullPage: true,
      mask,
      ...SCREENSHOT_OPTIONS,
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-Browser Visual Parity (structure only — actual browsers need CI)
// ---------------------------------------------------------------------------

test.describe('Visual Regression — Element Structure', { tag: ['@visual', '@smoke'] }, () => {
  test('CV page key elements maintain relative positioning', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cv-title')).toBeVisible();

    const title = await page.getByTestId('cv-title').boundingBox();
    const actions = await page.locator('.cv-actions').first().boundingBox();

    if (title && actions) {
      // Actions bar should be below the title
      expect(actions.y).toBeGreaterThan(title.y);
      // Both should be within the same content area
      expect(Math.abs(actions.x - title.x)).toBeLessThan(200);
    }
  });
});
