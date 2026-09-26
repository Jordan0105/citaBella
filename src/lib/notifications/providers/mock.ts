import { randomUUID } from "node:crypto";
import {
  type WhatsAppMessageInput,
  type WhatsAppProvider,
  type WhatsAppSendResult,
} from "../types";

/** Provider de desarrollo: no envía mensajes reales, devuelve un id simulado. */
export function createMockWhatsAppProvider(): WhatsAppProvider {
  return {
    name: "mock",
    async send(_input: WhatsAppMessageInput): Promise<WhatsAppSendResult> {
      void _input;
      return {
        ok: true,
        providerMessageId: `mock-${randomUUID()}`,
        status: "sent",
      };
    },
  };
}
