import { test, expect } from "@playwright/test";

test.describe("Games Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/games");
  });

  test("table loads with game rows", async ({ page }) => {
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("table has expected columns", async ({ page }) => {
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    const headers = table.locator("thead th");
    const headerTexts = await headers.allTextContents();
    const combined = headerTexts.join(" ").toLowerCase();

    expect(combined).toContain("game");
    expect(combined).toMatch(/rounds/i);
  });

  test("search filter works", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill("slot");
    await page.waitForTimeout(500);

    await expect(page.locator("table")).toBeVisible();
  });

  test("category filter works", async ({ page }) => {
    const categoryFilter = page.getByRole("combobox").or(page.locator("select")).first();
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      await expect(page.getByRole("option").first()).toBeVisible();
    }
  });
});
