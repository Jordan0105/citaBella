import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatPercent,
  nioToUsd,
  parseMoneyInput,
  roundMoney,
  usdToNio,
} from "../money";

describe("formatMoney", () => {
  it("formatea NIO con espacio tras el símbolo", () => {
    expect(formatMoney(1250, "NIO")).toBe("C$ 1,250.00");
  });

  it("formatea USD sin espacio tras el símbolo", () => {
    expect(formatMoney(25, "USD")).toBe("$25.00");
  });

  it("respeta decimales", () => {
    expect(formatMoney(1250.5, "NIO")).toBe("C$ 1,250.50");
    expect(formatMoney(0.99, "USD")).toBe("$0.99");
  });

  it("acepta strings numéricos (numeric de Postgres llega como string)", () => {
    expect(formatMoney("1250", "NIO")).toBe("C$ 1,250.00");
  });

  it("trata valores inválidos como 0", () => {
    expect(formatMoney(Number.NaN, "NIO")).toBe("C$ 0.00");
  });
});

describe("roundMoney (half-up, regla finance)", () => {
  it("redondea half-up a 2 decimales", () => {
    expect(roundMoney(549.995)).toBe(550);
    expect(roundMoney(999.995)).toBe(1000);
    expect(roundMoney(1.004)).toBe(1);
    expect(roundMoney(1.005)).toBe(1.01);
  });
});

describe("conversiones con tasa snapshot", () => {
  it("USD → NIO con tasa 36.80", () => {
    expect(usdToNio(25, 36.8)).toBe(920);
  });

  it("NIO → USD con tasa 36.80", () => {
    expect(nioToUsd(920, 36.8)).toBe(25);
  });
});

describe("formatPercent", () => {
  it("formatea porcentajes enteros", () => {
    expect(formatPercent(55)).toBe("55%");
    expect(formatPercent(45)).toBe("45%");
  });
});

describe("parseMoneyInput", () => {
  it("parsea entrada con separadores", () => {
    expect(parseMoneyInput("1,250.50")).toBe(1250.5);
    expect(parseMoneyInput("C$ 920")).toBe(920);
    expect(parseMoneyInput("")).toBe(0);
  });
});
