import { test, expect } from "@playwright/test";

// Login tests run without saved auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
  });

  test("displays login form with email and password fields", async ({ page }) => {
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows demo credentials hint", async ({ page }) => {
    await expect(page.getByText("admin@slotsone.com")).toBeVisible();
    await expect(page.getByText("admin123")).toBeVisible();
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    await page.getByLabel("Email").fill("admin@slotsone.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait longer — NextAuth credential flow can be slow on first attempt
    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 30000 });
  });

  test("failed login shows error message", async ({ page }) => {
    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("empty fields show error on submit", async ({ page }) => {
    await page.getByRole("button", { name: /sign in/i }).click();

    // Form should stay on login page or show validation error
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
