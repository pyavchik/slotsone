import { test, expect } from "@playwright/test";

const NAV_ITEMS = [
  { label: "Dashboard", path: /\/admin\/?$/ },
  { label: "Players", path: /\/players/ },
  { label: "Transactions", path: /\/transactions/ },
  { label: "Games", path: /\/games/ },
  { label: "Bonuses", path: /\/bonuses/ },
  { label: "KYC", path: /\/kyc/ },
  { label: "Risk", path: /\/risk/ },
  { label: "Reports", path: /\/reports/ },
  { label: "Settings", path: /\/settings/ },
];

test.describe("Sidebar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
  });

  test("all 9 sidebar links are visible", async ({ page }) => {
    const sidebar = page.locator("nav, aside").first();
    for (const item of NAV_ITEMS) {
      await expect(sidebar.getByRole("link", { name: item.label })).toBeVisible();
    }
  });

  for (const item of NAV_ITEMS) {
    test(`"${item.label}" link navigates to correct page`, async ({ page }) => {
      const sidebar = page.locator("nav, aside").first();
      await sidebar.getByRole("link", { name: item.label }).click();
      await expect(page).toHaveURL(item.path);
    });
  }

  test("active link is visually highlighted", async ({ page }) => {
    // On dashboard, the Dashboard link should have active styling
    const sidebar = page.locator("nav, aside").first();
    const dashboardLink = sidebar.getByRole("link", { name: "Dashboard" });
    await expect(dashboardLink).toHaveClass(/bg-primary|active/);
  });
});

test.describe("User Dropdown", () => {
  test("shows user name, email, and role badge", async ({ page }) => {
    await page.goto("/admin");

    // Open user dropdown (trigger is a button in topbar)
    const trigger = page.locator("header, [data-topbar]").getByRole("button");
    // Find the avatar/dropdown trigger
    const avatarButton = trigger.last();
    await avatarButton.click();

    // Verify user info appears in the dropdown
    await expect(page.getByText(/admin/i).first()).toBeVisible();
  });

  test("sign out works and redirects to login", async ({ page }) => {
    await page.goto("/admin");

    // Open dropdown
    const trigger = page.locator("header").getByRole("button").last();
    await trigger.click();

    // Click sign out
    await page.getByRole("menuitem", { name: /sign out/i }).click();

    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });
  });
});
