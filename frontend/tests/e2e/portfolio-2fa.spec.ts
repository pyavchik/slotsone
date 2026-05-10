import { expect, test } from '@playwright/test';

const ENDPOINT = '**/api/v1/portfolio/atlassian-2fa';
const PLACEHOLDER = 'Will appear here when Atlassian asks';

interface TwoFAResponse {
  code: string | null;
  receivedAt: string | null;
  ageSeconds: number | null;
}

const PAGES = [
  { name: 'jira', path: '/jira.html' },
  { name: 'zephyr', path: '/zephyr.html' },
];

for (const target of PAGES) {
  test.describe(`${target.name}.html – Atlassian 2FA inline row`, { tag: ['@regression'] }, () => {
    test('shows placeholder + disabled copy when no recent code', async ({ page, context }) => {
      const empty: TwoFAResponse = { code: null, receivedAt: null, ageSeconds: null };
      await context.route(ENDPOINT, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(empty) })
      );

      await page.goto(target.path);
      await page.waitForResponse((r) => r.url().includes('/portfolio/atlassian-2fa'));
      await page.waitForTimeout(200);

      const row = page.locator('#twofa-row');
      await expect(row).toBeVisible();
      await expect(row).not.toHaveClass(/active/);
      await expect(page.locator('#twofa-code')).toHaveText(PLACEHOLDER);
      await expect(page.locator('#twofa-copy')).toBeDisabled();
      await expect(page.locator('#twofa-meta')).toBeHidden();
    });

    test('row activates and renders the code when one arrives', async ({ page, context }) => {
      const code = 'ABC123';
      const now = new Date().toISOString();
      const fresh: TwoFAResponse = { code, receivedAt: now, ageSeconds: 3 };

      await context.route(ENDPOINT, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fresh) })
      );

      await page.goto(target.path);

      const row = page.locator('#twofa-row');
      await expect(row).toHaveClass(/active/);
      await expect(page.locator('#twofa-code')).toHaveText(code);
      await expect(page.locator('#twofa-copy')).toBeEnabled();
      await expect(page.locator('#twofa-meta')).toBeVisible();
      await expect(page.locator('#twofa-meta')).toContainText('Received');
      await expect(page.locator('#twofa-meta')).toContainText('ago');
    });

    test('copy button writes the code to the clipboard', async ({ page, context, browserName }) => {
      test.skip(browserName !== 'chromium', 'clipboard read is chromium-only here');

      const code = 'XYZ789';
      const now = new Date().toISOString();
      const fresh: TwoFAResponse = { code, receivedAt: now, ageSeconds: 1 };

      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await context.route(ENDPOINT, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fresh) })
      );

      await page.goto(target.path);
      await expect(page.locator('#twofa-code')).toHaveText(code);

      const copyBtn = page.locator('#twofa-copy');
      await copyBtn.click();
      await expect(copyBtn).toHaveText(/Copied/i);

      const clipboardValue = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardValue).toBe(code);
    });

    test('row deactivates and restores placeholder once the code ages past 5 minutes', async ({
      page,
      context,
    }) => {
      const stale: TwoFAResponse = {
        code: 'OLDOLD',
        receivedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
        ageSeconds: 360,
      };
      await context.route(ENDPOINT, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stale) })
      );

      await page.goto(target.path);
      await page.waitForResponse((r) => r.url().includes('/portfolio/atlassian-2fa'));
      await page.waitForTimeout(1500);

      const row = page.locator('#twofa-row');
      await expect(row).not.toHaveClass(/active/);
      await expect(page.locator('#twofa-code')).toHaveText(PLACEHOLDER);
      await expect(page.locator('#twofa-copy')).toBeDisabled();
      await expect(page.locator('#twofa-meta')).toBeHidden();
    });
  });
}
