import { describe, expect, it } from "vitest";
import { availabilitySchema, employeeSchema } from "../schemas/employee";

describe("employeeSchema", () => {
  it("acepta trabajadora válida con comisión nula (usa default)", () => {
    const result = employeeSchema.safeParse({
      fullName: "Ana López",
      specialty: "Colorista",
      color: "#B7A6E3",
      commissionPct: null,
      phone: "",
      isActive: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.commissionPct).toBeNull();
      expect(result.data.phone).toBeNull();
    }
  });

  it("normaliza teléfono y rechaza porcentaje fuera de rango", () => {
    const ok = employeeSchema.safeParse({
      fullName: "Betty Ruiz",
      color: "#D96A8B",
      commissionPct: 60,
      phone: "8412-3456",
      isActive: true,
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.phone).toBe("+50584123456");

    const bad = employeeSchema.safeParse({
      fullName: "Carla",
      color: "#9CC9A8",
      commissionPct: 150,
      isActive: true,
    });
    expect(bad.success).toBe(false);
  });

  it("rechaza color con formato inválido", () => {
    const result = employeeSchema.safeParse({
      fullName: "Ana López",
      color: "rosa",
      isActive: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("availabilitySchema", () => {
  it("acepta horario lunes a sábado", () => {
    const result = availabilitySchema.safeParse({
      employeeId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
      slots: [1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        startTime: "08:00",
        endTime: "17:00",
      })),
    });
    expect(result.success).toBe(true);
  });

  it("rechaza turno que termina antes de empezar", () => {
    const result = availabilitySchema.safeParse({
      employeeId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
      slots: [{ weekday: 1, startTime: "17:00", endTime: "08:00" }],
    });
    expect(result.success).toBe(false);
  });
});
