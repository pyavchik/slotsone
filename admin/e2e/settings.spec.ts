import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/settings");
  });

  test("admin users tab shows admin table", async ({ page }) => {
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("add admin button opens create dialog", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /add admin/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    const dialog = page.getByRole("dialog").or(page.locator("[role=dialog]"));
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test("create dialog has name, email, password, role fields", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /add admin/i });
    await addButton.click();

    const dialog = page.getByRole("dialog").or(page.locator("[role=dialog]"));
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Labels are bare (no htmlFor), so find fields by placeholder
    await expect(dialog.getByPlaceholder("Full name")).toBeVisible();
    await expect(dialog.getByPlaceholder("admin@slotsone.com")).toBeVisible();
    await expect(dialog.getByPlaceholder("Minimum 8 characters")).toBeVisible();
    // Role selector (Radix Select → renders as combobox trigger)
    await expect(dialog.getByRole("combobox")).toBeVisible();
  });

  test("audit log tab shows audit entries", async ({ page }) => {
    const auditTab = page.getByRole("tab", { name: /audit/i });
    await expect(auditTab).toBeVisible();
    await auditTab.click();

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });

  test("system tab shows system info", async ({ page }) => {
    const systemTab = page.getByRole("tab", { name: /system/i });
    await expect(systemTab).toBeVisible();
    await systemTab.click();

    // Should show system information section
    await expect(
      page
        .getByText(/system/i)
        .or(page.getByText(/configuration/i))
        .first()
    ).toBeVisible({ timeout: 10000 });
  });
});
