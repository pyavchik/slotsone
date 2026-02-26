import { expect, test } from '@playwright/test';

test.describe('Slots app', () => {
  test('opens slots in a new tab from CV page', async ({ page, context }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Oleksander Pyavchik/i })).toBeVisible();

    const [newTab] = await Promise.all([
      context.waitForEvent('page'),
      page
        .getByRole('button', { name: /^slots$/i })
        .first()
        .click(),
    ]);

    expect(newTab.url()).toBe('https://pyavchik.space/slots');
    await expect(page.getByRole('heading', { name: /Oleksander Pyavchik/i })).toBeVisible();
  });
});
