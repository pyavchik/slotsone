import { test, expect } from "@playwright/test";

test.describe("Bonuses Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/bonuses");
  });

  test("player bonuses tab shows table with data", async ({ page }) => {
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("type filter works", async ({ page }) => {
    const filters = page.getByRole("combobox").or(page.locator("select"));
    await expect(filters.first()).toBeVisible();
    await filters.first().click();

    await expect(page.getByRole("option").first()).toBeVisible();
  });

  test("status filter works", async ({ page }) => {
    const filters = page.getByRole("combobox").or(page.locator("select"));
    const count = await filters.count();
    if (count >= 2) {
      await filters.nth(1).click();
      await expect(page.getByRole("option").first()).toBeVisible();
    }
  });

  test("promotions tab shows promotions table", async ({ page }) => {
    const promotionsTab = page.getByRole("tab", { name: /promotion/i });
    await expect(promotionsTab).toBeVisible();
    await promotionsTab.click();

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  test("pagination works", async ({ page }) => {
    const table = page.locator("table");
    await expect(table.locator("tbody tr").first()).toBeVisible({
      timeout: 10000,
    });

    const nextButton = page
      .getByRole("button", { name: /next/i })
      .or(page.locator('button:has-text(">")'))
      .first();

    if (await nextButton.isVisible()) {
      await nextButton.click();
      await expect(table.locator("tbody tr").first()).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
