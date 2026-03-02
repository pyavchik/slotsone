import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@slotsone.com");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15000 });

  await page.context().storageState({ path: authFile });
});
