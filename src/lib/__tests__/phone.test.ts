import { describe, expect, it } from "vitest";
import {
  formatNicPhone,
  isValidNicPhone,
  normalizeNicPhone,
  phoneNicSchema,
} from "../phone";

describe("isValidNicPhone", () => {
  it("acepta móviles 8 dígitos iniciando en 8", () => {
    expect(isValidNicPhone("84123456")).toBe(true);
  });

  it("acepta móviles iniciando en 7", () => {
    expect(isValidNicPhone("77123456")).toBe(true);
  });

  it("acepta fijos iniciando en 2", () => {
    expect(isValidNicPhone("27890123")).toBe(true);
  });

  it("acepta con prefijo +505 y separadores", () => {
    expect(isValidNicPhone("+505 8412 3456")).toBe(true);
    expect(isValidNicPhone("8412-3456")).toBe(true);
    expect(isValidNicPhone("(505) 84123456")).toBe(true);
  });

  it("rechaza 7 dígitos, prefijos inválidos y letras", () => {
    expect(isValidNicPhone("8412345")).toBe(false);
    expect(isValidNicPhone("12345678")).toBe(false);
    expect(isValidNicPhone("54123456")).toBe(false);
    expect(isValidNicPhone("8412345a")).toBe(false);
    expect(isValidNicPhone("")).toBe(false);
  });
});

describe("normalizeNicPhone", () => {
  it("normaliza a +505 + 8 dígitos", () => {
    expect(normalizeNicPhone("8412-3456")).toBe("+50584123456");
    expect(normalizeNicPhone("+505 8412 3456")).toBe("+50584123456");
    expect(normalizeNicPhone("50584123456")).toBe("+50584123456");
  });
});

describe("formatNicPhone", () => {
  it("formatea para presentación", () => {
    expect(formatNicPhone("84123456")).toBe("+505 8412 3456");
  });
});

describe("phoneNicSchema", () => {
  it("valida y devuelve el teléfono normalizado", () => {
    const result = phoneNicSchema.safeParse("8412-3456");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("+50584123456");
  });

  it("rechaza teléfonos inválidos con mensaje en español", () => {
    const result = phoneNicSchema.safeParse("12345678");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("8 dígitos");
    }
  });
});
