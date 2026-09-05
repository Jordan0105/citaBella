import path from "node:path";
import { expect, test as setup } from "@playwright/test";

const statePath = path.join(process.cwd(), ".playwright", "owner.json");

/**
 * Inicia sesión UNA vez como dueña y guarda el estado de cookies.
 * Evita el rate limit del login (5/min) en las suites E2E.
 */
setup("authenticate as owner", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("owner@demo.ni");
  await page.getByLabel("Contraseña").fill("demo1234");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: statePath });
});
