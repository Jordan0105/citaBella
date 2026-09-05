import { describe, expect, it } from "vitest";
import { signInSchema } from "../schemas/sign-in";

describe("signInSchema", () => {
  it("acepta credenciales válidas y normaliza el correo", () => {
    const result = signInSchema.safeParse({
      email: "  Owner@Demo.NI  ",
      password: "demo1234",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("owner@demo.ni");
      expect(result.data.password).toBe("demo1234");
    }
  });

  it("rechaza correos inválidos", () => {
    const result = signInSchema.safeParse({
      email: "no-es-correo",
      password: "demo1234",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza contraseñas cortas", () => {
    const result = signInSchema.safeParse({
      email: "owner@demo.ni",
      password: "corta12",
    });
    expect(result.success).toBe(false);
  });
});
