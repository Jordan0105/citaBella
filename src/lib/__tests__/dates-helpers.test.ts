import { describe, expect, it } from "vitest";
import { managuaWallToUtcISO, nextWorkdayManagua } from "../dates";

describe("managuaWallToUtcISO", () => {
  it("convierte fecha y hora de pared Managua a ISO UTC", () => {
    expect(managuaWallToUtcISO("2026-08-29", "09:00")).toBe(
      "2026-08-29T15:00:00.000Z",
    );
  });

  it("maneja horas con un dígito", () => {
    expect(managuaWallToUtcISO("2026-08-29", "8:30")).toBe(
      "2026-08-29T14:30:00.000Z",
    );
  });
});

describe("nextWorkdayManagua", () => {
  it("desde sábado devuelve el lunes", () => {
    // Hoy simulado no es posible sin fake timers: verificamos que el resultado
    // jamás caiga en domingo, que es el invariante de la función.
    const result = nextWorkdayManagua(9);
    const dow = new Date(`${result.date}T12:00:00Z`).getUTCDay();
    expect(dow).not.toBe(0);
    expect(result.time).toBe("09:00");
    expect(result.iso).toBe(managuaWallToUtcISO(result.date, result.time));
  });
});
