import { expect, test } from "@playwright/test";

test.describe("Dashboard owner", () => {
  // Compilación fría del dev server: timeout holgado
  test.setTimeout(90_000);

  test("owner ve KPIs financieros y de agenda", async ({ page }) => {
    await page.goto("/dashboard");

    // Streaming SSR en dev frío puede tardar: timeouts holgados
    await expect(page.getByText("Citas de hoy", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Vendido hoy")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Vendido del mes")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Servicios del mes")).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe("Dashboard worker", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("worker ve solo sus métricas (sin finanzas del negocio)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Correo").fill("ana@demo.ni");
    await page.getByLabel("Contraseña").fill("demo1234");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await expect(page.getByText("Mis comisiones del mes")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Vendido hoy")).toHaveCount(0);
  });
});

test.describe("Reportes (owner)", () => {
  test("cambia de período y exporta a Excel", async ({ page }) => {
    await page.goto("/reports");

    await expect(
      page.getByText("Ingresos · Mensual", { exact: true }),
    ).toBeVisible();

    // Cambiar a diario
    await page.getByRole("tab", { name: "Diario" }).click();
    await expect(page).toHaveURL(/period=daily/);
    await expect(
      page.getByText("Ingresos · Diario", { exact: true }),
    ).toBeVisible();

    // Exportar Excel: se dispara la descarga con el nombre correcto
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar Excel" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^citabella-reporte-daily-.*\.xlsx$/,
    );
  });
});
