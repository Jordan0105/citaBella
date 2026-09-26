import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWhatsAppSignature } from "../webhook";
import { createMockWhatsAppProvider } from "../providers/mock";
import { normalizeWhatsAppPhone } from "../types";

describe("notifications", () => {
  describe("normalizeWhatsAppPhone", () => {
    it("elimina el + y caracteres no numéricos", () => {
      expect(normalizeWhatsAppPhone("+505 8412-3456")).toBe("50584123456");
    });

    it("deja intacto un número ya limpio", () => {
      expect(normalizeWhatsAppPhone("50584123456")).toBe("50584123456");
    });
  });

  describe("mock provider", () => {
    it("devuelve un id simulado y status sent", async () => {
      const provider = createMockWhatsAppProvider();
      const result = await provider.send({
        phone: "+50584123456",
        body: "Hola",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.providerMessageId).toMatch(/^mock-/);
      expect(result.status).toBe("sent");
    });
  });

  describe("verifyWhatsAppSignature", () => {
    it("acepta una firma válida", () => {
      const secret = "secreto";
      const body = JSON.stringify({ entry: [] });
      const signature =
        "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
      expect(verifyWhatsAppSignature(body, signature, secret)).toBe(true);
    });

    it("rechaza una firma inválida", () => {
      const body = JSON.stringify({ entry: [] });
      expect(verifyWhatsAppSignature(body, "sha256=abc", "secreto")).toBe(
        false,
      );
    });
  });
});
