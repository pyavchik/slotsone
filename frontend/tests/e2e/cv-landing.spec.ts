import { expect, test } from '@playwright/test';

test.describe('CV Landing – actions bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cv-title')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Slots button (header)
  // -------------------------------------------------------------------------

  test('header slots button navigates to /slots', async ({ page, context }) => {
    await context.route('**/api/v1/game/init', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    );

    const slotsBtn = page.getByTestId('cv-open-slots').first();
    await expect(slotsBtn).toBeVisible();
    await expect(slotsBtn).toHaveText('slots');

    await slotsBtn.click();
    await expect(page).toHaveURL(/\/slots/);
  });

  // -------------------------------------------------------------------------
  // Slots button (footer CTA)
  // -------------------------------------------------------------------------

  test('footer CTA slots button navigates to /slots', async ({ page, context }) => {
    await context.route('**/api/v1/game/init', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    );

    const ctaBtn = page.getByTestId('cv-open-slots').last();
    await expect(ctaBtn).toBeVisible();
    await expect(ctaBtn).toHaveText('slots');

    await ctaBtn.click();
    await expect(page).toHaveURL(/\/slots/);
  });

  // -------------------------------------------------------------------------
  // Postman link
  // -------------------------------------------------------------------------

  test('postman link points to /postman-tests.html and opens in new tab', async ({ page }) => {
    const postmanLink = page.locator('a.cv-link', { hasText: 'postman' });
    await expect(postmanLink).toBeVisible();
    await expect(postmanLink).toHaveAttribute('href', '/postman-tests.html');
    await expect(postmanLink).toHaveAttribute('target', '_blank');
    await expect(postmanLink).toHaveAttribute('rel', 'noreferrer');
  });

  test('postman link opens postman-tests page in new tab', async ({ page, context }) => {
    const postmanLink = page.locator('a.cv-link', { hasText: 'postman' });

    const [newPage] = await Promise.all([context.waitForEvent('page'), postmanLink.click()]);

    await newPage.waitForLoadState();
    expect(newPage.url()).toContain('/postman-tests.html');
    await newPage.close();
  });

  // -------------------------------------------------------------------------
  // Swagger link
  // -------------------------------------------------------------------------

  test('swagger link points to /api-docs and opens in new tab', async ({ page }) => {
    const swaggerLink = page.locator('a.cv-link', { hasText: 'swager' });
    await expect(swaggerLink).toBeVisible();
    await expect(swaggerLink).toHaveAttribute('href', '/api-docs');
    await expect(swaggerLink).toHaveAttribute('target', '_blank');
    await expect(swaggerLink).toHaveAttribute('rel', 'noreferrer');
  });

  test('swagger link opens api-docs page in new tab', async ({ page, context }) => {
    const swaggerLink = page.locator('a.cv-link', { hasText: 'swager' });

    const [newPage] = await Promise.all([context.waitForEvent('page'), swaggerLink.click()]);

    await newPage.waitForLoadState();
    expect(newPage.url()).toContain('/api-docs');
    await newPage.close();
  });

  // -------------------------------------------------------------------------
  // PDF download link
  // -------------------------------------------------------------------------

  test('PDF link points to the CV file and opens in new tab', async ({ page }) => {
    const pdfLink = page.locator('a.cv-link', { hasText: 'Download PDF CV' });
    await expect(pdfLink).toBeVisible();
    await expect(pdfLink).toHaveAttribute('href', '/QA_Oleksander_Pyavchik_CV.pdf');
    await expect(pdfLink).toHaveAttribute('target', '_blank');
    await expect(pdfLink).toHaveAttribute('rel', 'noreferrer');
  });

  test('PDF link opens the correct URL in a new tab', async ({ page, context }) => {
    const pdfLink = page.locator('a.cv-link', { hasText: 'Download PDF CV' });

    // Use text/plain so Chromium navigates to the URL instead of triggering
    // a download (application/pdf causes the new tab to stay at about:blank).
    await context.route('**/QA_Oleksander_Pyavchik_CV.pdf', (route) =>
      route.fulfill({ status: 200, contentType: 'text/plain', body: 'stub' })
    );

    const pagePromise = context.waitForEvent('page');
    await pdfLink.click();
    const newPage = await pagePromise;
    await newPage.waitForLoadState();

    expect(newPage.url()).toContain('/QA_Oleksander_Pyavchik_CV.pdf');
    await newPage.close();
  });

  // -------------------------------------------------------------------------
  // Test cases link
  // -------------------------------------------------------------------------

  test('test cases link points to /test-cases.html and opens in new tab', async ({ page }) => {
    const testCasesLink = page.getByTestId('cv-test-cases');
    await expect(testCasesLink).toBeVisible();
    await expect(testCasesLink).toHaveText('test cases');
    await expect(testCasesLink).toHaveAttribute('href', '/test-cases.html');
    await expect(testCasesLink).toHaveAttribute('target', '_blank');
    await expect(testCasesLink).toHaveAttribute('rel', 'noreferrer');
  });

  test('test cases link opens test-cases page in new tab', async ({ page, context }) => {
    const testCasesLink = page.getByTestId('cv-test-cases');

    const [newPage] = await Promise.all([context.waitForEvent('page'), testCasesLink.click()]);

    await newPage.waitForLoadState();
    expect(newPage.url()).toContain('/test-cases.html');
    await newPage.close();
  });

  // -------------------------------------------------------------------------
  // All five actions are rendered (slots + test cases + postman + swagger + pdf)
  // -------------------------------------------------------------------------

  test('renders all five cv-actions elements', async ({ page }) => {
    const actions = page.locator('.cv-actions').first();
    await expect(actions.getByTestId('cv-open-slots')).toBeVisible();
    await expect(actions.getByTestId('cv-test-cases')).toBeVisible();
    await expect(actions.locator('a.cv-link', { hasText: 'postman' })).toBeVisible();
    await expect(actions.locator('a.cv-link', { hasText: 'swager' })).toBeVisible();
    await expect(actions.locator('a.cv-link', { hasText: 'Download PDF CV' })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Action bar order: slots → test cases → postman → swagger → pdf
  // -------------------------------------------------------------------------

  test('action bar items appear in correct order', async ({ page }) => {
    const items = page.locator('.cv-actions').first().locator('button, a');
    await expect(items.nth(0)).toHaveText('slots');
    await expect(items.nth(1)).toHaveText('test cases');
    await expect(items.nth(2)).toHaveText('postman');
    await expect(items.nth(3)).toHaveText('swager');
    await expect(items.nth(4)).toHaveText('Download PDF CV');
  });
});
