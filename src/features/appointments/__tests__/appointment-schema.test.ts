import { describe, expect, it } from "vitest";
import {
  createAppointmentSchema,
  finalizeAppointmentSchema,
} from "../schemas/appointment";

const validInput = {
  clientId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  employeeId: "3f2504e0-4f89-11d3-9a0c-0305e82c3302",
  serviceIds: ["3f2504e0-4f89-11d3-9a0c-0305e82c3303"],
  startsAt: "2026-09-01T15:00:00.000Z",
  currency: "NIO" as const,
  discount: 0,
};

describe("createAppointmentSchema", () => {
  it("acepta una cita válida", () => {
    expect(createAppointmentSchema.safeParse(validInput).success).toBe(true);
  });

  it("rechaza sin servicios", () => {
    const result = createAppointmentSchema.safeParse({
      ...validInput,
      serviceIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza descuento negativo", () => {
    const result = createAppointmentSchema.safeParse({
      ...validInput,
      discount: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza moneda inválida", () => {
    const result = createAppointmentSchema.safeParse({
      ...validInput,
      currency: "EUR",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza endsAt anterior a startsAt cuando se provee", () => {
    const result = createAppointmentSchema.safeParse({
      ...validInput,
      endsAt: "2026-09-01T14:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("finalizeAppointmentSchema", () => {
  it("acepta método de pago válido y propina", () => {
    const result = finalizeAppointmentSchema.safeParse({
      id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
      method: "cash",
      tip: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza método inválido y propina negativa", () => {
    expect(
      finalizeAppointmentSchema.safeParse({
        id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
        method: "cripto",
        tip: 0,
      }).success,
    ).toBe(false);
    expect(
      finalizeAppointmentSchema.safeParse({
        id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
        method: "cash",
        tip: -5,
      }).success,
    ).toBe(false);
  });
});
