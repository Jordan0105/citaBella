import { expect, test } from "@playwright/test";

test.describe("Landing pública", () => {
  test("muestra la marca y las características", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/CitaBella/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "CitaBella",
    );
    await expect(page.getByText("Agenda inteligente")).toBeVisible();
  });
});
