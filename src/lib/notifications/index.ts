import { createMetaWhatsAppProvider } from "./providers/meta";
import { createMockWhatsAppProvider } from "./providers/mock";
import type { WhatsAppProvider } from "./types";

export { dispatchWhatsAppReminder } from "./dispatch-reminder";

export function createWhatsAppProvider(): WhatsAppProvider {
  const provider = process.env.WHATSAPP_PROVIDER ?? "mock";

  if (provider === "meta") {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      // En desarrollo sin credenciales caemos a mock; en producción esto se
      // detecta en la action y se devuelve error antes de llamar al provider.
      return createMockWhatsAppProvider();
    }
    return createMetaWhatsAppProvider({
      apiToken: token,
      phoneNumberId,
      templateName: process.env.WHATSAPP_TEMPLATE_REMINDER,
    });
  }

  return createMockWhatsAppProvider();
}

export * from "./types";
export { createMetaWhatsAppProvider } from "./providers/meta";
export { createMockWhatsAppProvider } from "./providers/mock";
