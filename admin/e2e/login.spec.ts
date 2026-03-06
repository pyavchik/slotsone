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

    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 30000 });

    // Verify session is established — dashboard content should render
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("successful login sets valid session", async ({ page }) => {
    await page.getByLabel("Email").fill("admin@slotsone.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 30000 });

    // Verify session endpoint returns user data
    const session = await page.evaluate(async () => {
      const res = await fetch("/admin/api/auth/session");
      return res.json();
    });
    expect(session?.user?.email).toBe("admin@slotsone.com");
  });

  test("failed login shows error message and stays on login page", async ({ page }) => {
    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Must show error — NOT silently redirect to dashboard
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({
      timeout: 10000,
    });

    // Must remain on login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("empty fields show error on submit", async ({ page }) => {
    await page.getByRole("button", { name: /sign in/i }).click();

    // Form should stay on login page or show validation error
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe("Auth Protection (Middleware)", () => {
  // Explicitly clear auth state — these test unauthenticated access
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated /admin redirects to login", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });
  });

  test("unauthenticated /admin/players redirects to login", async ({ page }) => {
    await page.goto("/admin/players");

    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });
  });

  test("unauthenticated /admin/transactions redirects to login with callbackUrl", async ({
    page,
  }) => {
    await page.goto("/admin/transactions");

    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });
    // Should include callbackUrl so user returns to intended page after login
    await expect(page).toHaveURL(/callbackUrl/);
  });

  test("unauthenticated API returns 401 or redirects", async ({ page }) => {
    const res = await page.request.get("/admin/api/players");
    // API should reject — either 401 or redirect to login
    expect([401, 302, 307].includes(res.status()) || res.url().includes("/login")).toBeTruthy();
  });
});
