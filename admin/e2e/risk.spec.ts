import { test, expect } from "@playwright/test";

test.describe("Risk Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/risk");
  });

  test("flagged players tab shows high-risk players table", async ({ page }) => {
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("AML alerts tab shows alerts table", async ({ page }) => {
    const amlTab = page.getByRole("tab", { name: /aml/i });
    await expect(amlTab).toBeVisible();
    await amlTab.click();

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });

  test("duplicate detection tab shows table", async ({ page }) => {
    const dupTab = page.getByRole("tab", { name: /duplicate/i });
    await expect(dupTab).toBeVisible();
    await dupTab.click();

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  test("clicking a flagged player navigates to detail", async ({ page }) => {
    const table = page.locator("table");
    await expect(table.locator("tbody tr").first()).toBeVisible({
      timeout: 10000,
    });

    // Click the first flagged player row
    await table.locator("tbody tr").first().click();

    await expect(page).toHaveURL(/\/players\//, { timeout: 10000 });
  });
});
