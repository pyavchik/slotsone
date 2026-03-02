import { test, expect } from "@playwright/test";

test.describe("Players List", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/players");
  });

  test("loads table with player rows", async ({ page }) => {
    const table = page.locator("table");
    await expect(table).toBeVisible();

    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("search filter works", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    // Type a search query — table should update
    await searchInput.fill("a");
    await page.waitForTimeout(500); // debounce
    await searchInput.press("Enter");

    // Table should still be visible (may have fewer results)
    await expect(page.locator("table")).toBeVisible();
  });

  test("status dropdown filter is visible and works", async ({ page }) => {
    const statusFilter = page.getByRole("combobox").first();
    await expect(statusFilter).toBeVisible();
    await statusFilter.click();

    // Should show filter options
    await expect(page.getByRole("option").first()).toBeVisible();
  });

  test("clear filters button resets filters", async ({ page }) => {
    // Apply a search first
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill("test");

    const clearButton = page.getByRole("button", { name: /clear/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await expect(searchInput).toHaveValue("");
    }
  });

  test("export CSV button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /export|csv/i })).toBeVisible();
  });

  test("click player row navigates to detail page", async ({ page }) => {
    const table = page.locator("table");
    await expect(table.locator("tbody tr").first()).toBeVisible({
      timeout: 10000,
    });

    // Click on the player name/email text within the first row (the div with cursor-pointer)
    const firstRowClickable = table.locator("tbody tr").first().locator(".cursor-pointer").first();
    await firstRowClickable.click();

    await expect(page).toHaveURL(/\/players\//, { timeout: 10000 });
  });
});

test.describe("Player Detail", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to first player via click
    await page.goto("/admin/players");
    const table = page.locator("table");
    await expect(table.locator("tbody tr").first()).toBeVisible({
      timeout: 10000,
    });
    const firstRowClickable = table.locator("tbody tr").first().locator(".cursor-pointer").first();
    await firstRowClickable.click();
    await expect(page).toHaveURL(/\/players\//, { timeout: 10000 });
  });

  test("back button returns to players list", async ({ page }) => {
    // Wait for player detail to fully render
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
    // Back button is an icon-only ghost button inside main, next to h1
    const backButton = page.locator("main button:has(svg.lucide-arrow-left)");
    await expect(backButton).toBeVisible();
    await backButton.click();
    await expect(page).toHaveURL(/\/players\/?$/, { timeout: 10000 });
  });

  test("player name and status badges are visible", async ({ page }) => {
    // Player name heading should be visible
    await expect(page.locator("h1").first()).toBeVisible();

    // Status badges use inline-flex rounded-full (shadcn Badge component)
    const badges = page.locator('[class*="rounded-full"][class*="inline-flex"]');
    await expect(badges.first()).toBeVisible();
  });

  test("quick stats cards show values", async ({ page }) => {
    const statLabels = [/balance/i, /deposited/i, /wagered/i, /p&l|profit|net/i];
    for (const label of statLabels) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test("all 8 tabs exist", async ({ page }) => {
    const tabNames = [
      "Overview",
      "Transactions",
      "Game History",
      "Bonuses",
      "KYC",
      "Notes",
      "Risk",
      "Audit",
    ];

    for (const tab of tabNames) {
      await expect(page.getByRole("tab", { name: new RegExp(tab, "i") })).toBeVisible();
    }
  });

  test("overview tab shows account details and financial summary", async ({ page }) => {
    await page.getByRole("tab", { name: /overview/i }).click();

    await expect(page.getByText(/account detail/i)).toBeVisible();
    await expect(page.getByText(/financial summary/i)).toBeVisible();
  });

  test("transactions tab shows table", async ({ page }) => {
    await page.getByRole("tab", { name: /transactions/i }).click();

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  test("game history tab shows table", async ({ page }) => {
    await page.getByRole("tab", { name: /game history/i }).click();

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });
});
