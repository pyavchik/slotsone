import { expect, test } from '@playwright/test';

const ENDPOINT = '**/api/v1/portfolio/atlassian-2fa';

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
  test.describe(`${target.name}.html – Atlassian 2FA panel`, { tag: ['@regression'] }, () => {
    test('panel stays hidden when no recent code is available', async ({ page, context }) => {
      const empty: TwoFAResponse = { code: null, receivedAt: null, ageSeconds: null };
      await context.route(ENDPOINT, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(empty) })
      );

      await page.goto(target.path);
      await page.waitForResponse((r) => r.url().includes('/portfolio/atlassian-2fa'));
      // Give the polling logic a moment to apply the response.
      await page.waitForTimeout(200);

      const panel = page.locator('#twofa-panel');
      await expect(panel).toHaveCount(1);
      await expect(panel).not.toHaveClass(/active/);
      await expect(panel).toBeHidden();
    });

    test('panel becomes visible and renders the code when one arrives', async ({
      page,
      context,
    }) => {
      const code = 'ABC123';
      const now = new Date().toISOString();
      const fresh: TwoFAResponse = { code, receivedAt: now, ageSeconds: 3 };

      await context.route(ENDPOINT, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fresh) })
      );

      await page.goto(target.path);

      const panel = page.locator('#twofa-panel');
      await expect(panel).toHaveClass(/active/);
      await expect(panel).toBeVisible();
      await expect(page.locator('#twofa-code')).toHaveText(code);
      await expect(page.locator('#twofa-meta')).toContainText('Received');
      await expect(page.locator('#twofa-meta')).toContainText('ago');
    });

    test('copy button writes the code to the clipboard', async ({ page, context, browserName }) => {
      // Permissions API for clipboard read isn't supported on Firefox/Webkit consistently;
      // the current Playwright project is chromium-only but keep this guard for clarity.
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

    test('panel hides itself once the cached code ages past 5 minutes', async ({
      page,
      context,
    }) => {
      // Return a 6-minute-old code; the client treats it as stale and should hide the panel.
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
      // Wait for the 1-second age tick to detect the staleness.
      await page.waitForTimeout(1500);

      const panel = page.locator('#twofa-panel');
      await expect(panel).not.toHaveClass(/active/);
      await expect(panel).toBeHidden();
    });
  });
}
