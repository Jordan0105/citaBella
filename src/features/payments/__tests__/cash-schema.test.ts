import { describe, expect, it } from "vitest";
import { registerIncomeSchema, saveExpenseSchema } from "../schemas/cash";

describe("registerIncomeSchema", () => {
  it("acepta ingreso directo válido con propina", () => {
    const result = registerIncomeSchema.safeParse({
      description: "Venta de productos",
      amount: 500,
      currency: "NIO",
      method: "cash",
      tip: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza monto 0 y método inválido", () => {
    expect(
      registerIncomeSchema.safeParse({
        description: "Venta",
        amount: 0,
        currency: "NIO",
        method: "cash",
        tip: 0,
      }).success,
    ).toBe(false);
    expect(
      registerIncomeSchema.safeParse({
        description: "Venta",
        amount: 100,
        currency: "NIO",
        method: "cripto",
        tip: 0,
      }).success,
    ).toBe(false);
  });
});

describe("saveExpenseSchema", () => {
  it("acepta gasto válido por categoría", () => {
    const result = saveExpenseSchema.safeParse({
      description: "Compra de shampoo",
      amount: 1200,
      currency: "NIO",
      method: "cash",
      category: "supplies",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza categoría desconocida", () => {
    expect(
      saveExpenseSchema.safeParse({
        description: "Gasto raro",
        amount: 100,
        currency: "USD",
        method: "card",
        category: "vacaciones",
      }).success,
    ).toBe(false);
  });
});
