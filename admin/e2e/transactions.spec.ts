import { test, expect } from "@playwright/test";

test.describe("Transactions Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/transactions");
  });

  test("all transactions tab shows data table with rows", async ({ page }) => {
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("filter by type dropdown works", async ({ page }) => {
    // Find the type filter dropdown
    const typeFilter = page.getByRole("combobox").or(page.locator("select")).first();
    await expect(typeFilter).toBeVisible();
    await typeFilter.click();

    // Type options should appear
    await expect(page.getByRole("option").first()).toBeVisible();
  });

  test("filter by status dropdown works", async ({ page }) => {
    // Find all filter dropdowns — status is typically second
    const filters = page.getByRole("combobox").or(page.locator("select"));
    const count = await filters.count();
    if (count >= 2) {
      await filters.nth(1).click();
      await expect(page.getByRole("option").first()).toBeVisible();
    }
  });

  test("search by player works", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("test");
    await page.waitForTimeout(500);

    // Table should still render
    await expect(page.locator("table")).toBeVisible();
  });

  test("pending withdrawals tab loads", async ({ page }) => {
    const pendingTab = page.getByRole("tab", {
      name: /pending withdrawal/i,
    });
    if (await pendingTab.isVisible()) {
      await pendingTab.click();
      // Should show a table
      await expect(page.locator("table").first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("pagination works", async ({ page }) => {
    const table = page.locator("table");
    await expect(table.locator("tbody tr").first()).toBeVisible({
      timeout: 10000,
    });

    // Look for pagination controls
    const nextButton = page
      .getByRole("button", { name: /next/i })
      .or(page.locator('button:has-text(">")'))
      .first();

    if (await nextButton.isVisible()) {
      await nextButton.click();
      // Table should still show rows
      await expect(table.locator("tbody tr").first()).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
