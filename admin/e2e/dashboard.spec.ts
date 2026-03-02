import { test, expect } from "@playwright/test";

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
  });

  test("displays 4 KPI cards with numeric values", async ({ page }) => {
    const kpiLabels = ["Total Players", "Total Bets", "Total Wins", "GGR"];

    for (const label of kpiLabels) {
      const card = page.locator(`text=${label}`).first();
      await expect(card).toBeVisible();
    }

    // Verify KPI cards contain numeric values (numbers or currency)
    const cards = page.locator('[class*="card"]').filter({ hasText: /\d/ });
    await expect(cards.first()).toBeVisible();
  });

  test("alert cards are visible", async ({ page }) => {
    await expect(page.getByText(/Pending KYC/i)).toBeVisible();
    await expect(page.getByText(/High Risk/i)).toBeVisible();
  });

  test("charts section renders", async ({ page }) => {
    // Recharts renders SVG elements
    const charts = page.locator(".recharts-wrapper, .recharts-surface, canvas, svg");
    await expect(charts.first()).toBeVisible({ timeout: 10000 });
  });

  test("recent large transactions table is visible", async ({ page }) => {
    await expect(page.getByText(/Recent Large Transactions/i)).toBeVisible();

    const table = page.locator("table").last();
    await expect(table).toBeVisible();
  });
});
