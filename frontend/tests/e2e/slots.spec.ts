import { expect, test } from '@playwright/test';

test.describe('Slots app', () => {
  test('opens slots game at /slots route', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Oleksander Pyavchik/i })).toBeVisible();
    await page
      .getByRole('button', { name: /^slots$/i })
      .first()
      .click();

    await expect(page).toHaveURL('/slots');
  });
});
