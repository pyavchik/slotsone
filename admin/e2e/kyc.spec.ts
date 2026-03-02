import { test, expect } from "@playwright/test";

test.describe("KYC Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/kyc");
  });

  test("table loads with default pending filter", async ({ page }) => {
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("status filter works", async ({ page }) => {
    const filters = page.getByRole("combobox").or(page.locator("select"));
    await expect(filters.first()).toBeVisible();
    await filters.first().click();

    await expect(page.getByRole("option").first()).toBeVisible();
  });

  test("document type filter works", async ({ page }) => {
    const filters = page.getByRole("combobox").or(page.locator("select"));
    const count = await filters.count();
    if (count >= 2) {
      await filters.nth(1).click();
      await expect(page.getByRole("option").first()).toBeVisible();
    }
  });

  test("approve/reject action buttons visible on pending docs", async ({ page }) => {
    const table = page.locator("table");
    await expect(table.locator("tbody tr").first()).toBeVisible({
      timeout: 10000,
    });

    // Approve and Reject buttons should be present
    const approveButtons = page.getByRole("button", { name: /approve/i });
    const rejectButtons = page.getByRole("button", { name: /reject/i });

    expect((await approveButtons.count()) + (await rejectButtons.count())).toBeGreaterThan(0);
  });

  test("reject button opens dialog with textarea", async ({ page }) => {
    const table = page.locator("table");
    await expect(table.locator("tbody tr").first()).toBeVisible({
      timeout: 10000,
    });

    const rejectButton = page.getByRole("button", { name: /reject/i }).first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();

      // Dialog should appear with a textarea for rejection reason
      const dialog = page.getByRole("dialog").or(page.locator("[role=dialog]"));
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.locator("textarea")).toBeVisible();
    }
  });
});
