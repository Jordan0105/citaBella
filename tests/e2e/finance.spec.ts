import { expect, test } from "@playwright/test";

/**
 * Finanzas (owner, sesión vía auth.setup.ts): registrar gasto en caja y
 * crear servicio en el catálogo. Usan nombres únicos por minuto.
 */
test.describe("Fase 3 — caja y catálogo (owner)", () => {
  function salt() {
    return Math.floor(Date.now() / 60_000) % 1000;
  }

  test("registra un gasto y aparece en la lista de caja", async ({ page }) => {
    await page.goto("/finance");

    await page.getByRole("button", { name: "Registrar gasto" }).click();
    const description = `Gasto e2e ${salt()}`;
    await page.getByLabel("Descripción").fill(description);
    await page.getByLabel("Monto").fill("120.50");
    await page.getByRole("button", { name: "Registrar gasto" }).click();

    await expect(page.getByText("Gasto registrado")).toBeVisible({
      timeout: 10_000,
    });

    // Aparece en la pestaña de gastos (Radix Tabs oculta el contenido inactivo)
    await page.getByRole("tab", { name: "Gastos" }).click();
    await expect(page.getByText(description).first()).toBeVisible();
  });

  test("crea un servicio y aparece en el catálogo", async ({ page }) => {
    await page.goto("/services");

    await page.getByRole("button", { name: "Nuevo servicio" }).click();
    const name = `Servicio e2e ${salt()}`;
    await page.getByLabel("Nombre").fill(name);
    await page.getByLabel("Precio C$").fill("800");
    await page.getByLabel("Precio $").fill("21.75");
    await page.getByLabel("Duración (min)").fill("60");
    await page.getByRole("button", { name: "Crear servicio" }).click();

    await expect(page.getByText("Servicio creado")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(name).first()).toBeVisible();
  });
});
