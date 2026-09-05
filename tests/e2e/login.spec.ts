import { expect, test } from "@playwright/test";

test.describe("Login", () => {
  // Estas pruebas verifican el login real: estado vacío (sin sesión precargada)
  test.use({ storageState: { cookies: [], origins: [] } });

  test("muestra el formulario y valida credenciales inválidas", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByText("Bienvenida")).toBeVisible();
    await expect(page.getByLabel("Correo")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();

    await page.getByLabel("Correo").fill("recep@demo.ni");
    await page.getByLabel("Contraseña").fill("incorrecta1");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page.getByText("Credenciales incorrectas")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("ingresa y llega al dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Correo").fill("ana@demo.ni");
    await page.getByLabel("Contraseña").fill("demo1234");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();
  });

  test("redirige a login cuando no hay sesión", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
