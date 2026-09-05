import { describe, expect, it } from "vitest";
import { serviceSchema } from "../schemas/service";

describe("serviceSchema", () => {
  it("acepta servicio con override de comisión", () => {
    const result = serviceSchema.safeParse({
      name: "Mechas",
      description: "",
      priceNio: 1800,
      priceUsd: 49,
      durationMinutes: 150,
      commissionPct: 60,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.commissionPct).toBe(60);
  });

  it("acepta comisión nula (usa default) y transforma descripción vacía", () => {
    const result = serviceSchema.safeParse({
      name: "Corte mujer",
      description: "",
      priceNio: 350,
      priceUsd: 9.5,
      durationMinutes: 45,
      commissionPct: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.commissionPct).toBeNull();
      expect(result.data.description).toBeNull();
    }
  });

  it("rechaza precios 0 y comisión fuera de rango", () => {
    expect(
      serviceSchema.safeParse({
        name: "Corte",
        priceNio: 0,
        priceUsd: 1,
        durationMinutes: 30,
      }).success,
    ).toBe(false);
    expect(
      serviceSchema.safeParse({
        name: "Corte",
        priceNio: 100,
        priceUsd: 1,
        durationMinutes: 30,
        commissionPct: 120,
      }).success,
    ).toBe(false);
  });
});
