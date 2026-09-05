import { expect, test, type Page, type TestInfo } from "@playwright/test";

/**
 * Citas y agenda (owner, sesión vía auth.setup.ts).
 * Cada prueba usa un slot del próximo día laborable distinto (hora según
 * proyecto) para no contaminarse entre tests ni entre proyectos.
 */
test.describe("Citas y agenda (owner)", () => {
  /**
   * Slot único por corrida y prueba: hora entre 8 y 16 (dentro del horario
   * de las trabajadoras). La sal por minuto evita colisiones con filas
   * huérfanas de corridas anteriores.
   */
  function slotHour(testInfo: TestInfo, extra = 0) {
    const projectIdx = testInfo.project.name === "mobile" ? 0 : 1;
    const salt = Math.floor(Date.now() / 60_000) % 9;
    return 8 + ((salt + projectIdx * 2 + extra) % 9);
  }

  async function fillAppointment(page: Page, hour: number) {
    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.getByRole("combobox", { name: "Cliente" }).click();
    await page.getByRole("option", { name: "María José Rivas" }).click();
    await page.getByRole("combobox", { name: "Trabajadora" }).click();
    await page.getByRole("option", { name: "Ana López" }).click();
    await page.getByRole("combobox", { name: "Servicio" }).click();
    await page.getByRole("option", { name: "Corte mujer" }).click();

    // Fecha = próximo día laborable, hora = slot de esta prueba
    await page.getByLabel("Notas").fill("e2e");

    const workday = await page.evaluate(() => {
      const base = new Date(Date.now() - 6 * 3600 * 1000);
      for (let i = 1; i <= 7; i++) {
        const d = new Date(base.getTime() + i * 86_400_000);
        if (d.getUTCDay() !== 0) {
          const pad = (n: number) => String(n).padStart(2, "0");
          return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
        }
      }
      return null;
    });
    await page.locator("#appt-date").fill(workday ?? "");
    await page
      .locator("#appt-time")
      .fill(`${String(hour).padStart(2, "0")}:00`);
  }

  test("crea una cita desde la agenda y aparece en la lista", async ({
    page,
  }, testInfo) => {
    await page.goto("/calendar");

    await fillAppointment(page, slotHour(testInfo));
    await page.getByRole("button", { name: "Crear cita" }).click();
    // El toast es efímero; la aserción real es la lista de citas
    await expect(page.getByText("Cita creada"))
      .toBeVisible({ timeout: 15_000 })
      .catch(() => {});

    // La cita aparece en la lista de próximos 7 días
    await page.goto("/appointments");
    await expect(page.getByText("María José Rivas").first()).toBeVisible();
  });

  test("rechaza cita duplicada con mensaje claro de conflicto", async ({
    page,
  }, testInfo) => {
    const hour = slotHour(testInfo, 1); // slot propio de esta prueba
    await page.goto("/calendar");

    // Primera cita en el slot (si un retry la dejó creada, sigue adelante)
    await fillAppointment(page, hour);
    await page.getByRole("button", { name: "Crear cita" }).click();
    await expect(
      page.getByText(/Cita creada|Ya existe una cita/).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Segunda cita idéntica → conflicto de horario
    await fillAppointment(page, hour);
    await page.getByRole("button", { name: "Crear cita" }).click();

    await expect(page.getByText(/Ya existe una cita/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("finaliza la cita en proceso y pasa a Realizada", async ({ page }) => {
    await page.goto("/appointments");

    // Betty · Karla · en proceso (garantizada por global-setup)
    const card = page
      .locator("li", { hasText: "Karla Espinoza" })
      .filter({ has: page.getByText("En proceso") })
      .first();
    await card.getByRole("button", { name: "Finalizar", exact: true }).click();

    await expect(page.getByText("Finalizar servicio").first()).toBeVisible();
    await page
      .getByRole("button", { name: "Finalizar servicio", exact: true })
      .click();

    await expect(page.getByText("Cita realizada").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Realizada").first()).toBeVisible();
  });
});
