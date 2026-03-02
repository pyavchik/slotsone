import { test, expect } from "@playwright/test";

test.describe("Reports Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/reports");
  });

  test("period selector dropdown works", async ({ page }) => {
    const periodSelector = page.getByRole("combobox").or(page.locator("select")).first();
    await expect(periodSelector).toBeVisible();
    await periodSelector.click();

    // Should show period options (7/30/90/365 days)
    await expect(page.getByRole("option").first()).toBeVisible();
  });

  test("financial tab shows summary cards and daily breakdown", async ({ page }) => {
    // Financial tab should be active by default or click it
    const financialTab = page.getByRole("tab", { name: /financial/i });
    if (await financialTab.isVisible()) {
      await financialTab.click();
    }

    // Summary cards should be visible
    const cards = page.locator('[class*="card"]').filter({ hasText: /\d/ });
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Table for daily breakdown
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  test("players tab shows registration data", async ({ page }) => {
    const playersTab = page.getByRole("tab", { name: /player/i });
    await expect(playersTab).toBeVisible();
    await playersTab.click();

    // Should show player registration related content
    await expect(
      page
        .getByText(/registration/i)
        .or(page.getByText(/status/i))
        .first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("games tab shows game performance table", async ({ page }) => {
    const gamesTab = page.getByRole("tab", { name: /game/i });
    await expect(gamesTab).toBeVisible();
    await gamesTab.click();

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  test("export buttons are visible", async ({ page }) => {
    const exportButtons = page.getByRole("button", {
      name: /export|download|csv/i,
    });
    await expect(exportButtons.first()).toBeVisible({ timeout: 10000 });
  });
});
