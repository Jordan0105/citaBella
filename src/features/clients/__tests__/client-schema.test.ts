import { describe, expect, it } from "vitest";
import { clientSchema } from "../schemas/client";

describe("clientSchema", () => {
  it("valida y normaliza teléfono NIC", () => {
    const result = clientSchema.safeParse({
      fullName: "María José Rivas",
      phone: "8412-3456",
      whatsapp: "",
      email: "",
      birthDate: "",
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+50584123456");
      expect(result.data.whatsapp).toBeNull();
      expect(result.data.email).toBeNull();
      expect(result.data.birthDate).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("rechaza teléfono inválido", () => {
    const result = clientSchema.safeParse({
      fullName: "Karla Espinoza",
      phone: "12345678",
      whatsapp: "",
      email: "",
      birthDate: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre muy corto", () => {
    const result = clientSchema.safeParse({
      fullName: "A",
      phone: "84123456",
      whatsapp: "",
      email: "",
      birthDate: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza fecha de nacimiento futura", () => {
    const result = clientSchema.safeParse({
      fullName: "Lucía Aguirre",
      phone: "77889999",
      whatsapp: "",
      email: "",
      birthDate: "2099-01-01",
    });
    expect(result.success).toBe(false);
  });
});
