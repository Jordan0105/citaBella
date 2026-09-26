import {
  normalizeWhatsAppPhone,
  type WhatsAppMessageInput,
  type WhatsAppProvider,
  type WhatsAppSendResult,
} from "../types";

interface MetaConfig {
  apiToken: string;
  phoneNumberId: string;
  templateName?: string;
}

export function createMetaWhatsAppProvider(
  config: MetaConfig,
): WhatsAppProvider {
  return {
    name: "meta",
    async send(input: WhatsAppMessageInput): Promise<WhatsAppSendResult> {
      const to = normalizeWhatsAppPhone(input.phone);
      const template = config.templateName ?? input.templateName;

      const body = template
        ? buildTemplateBody(
            to,
            template,
            input.templateVariables ?? [input.body],
          )
        : buildTextBody(to, input.body);

      const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        const errorMessage =
          extractErrorMessage(data) ?? `Meta API error ${response.status}`;
        return { ok: false, error: errorMessage };
      }

      const messages = data.messages as Array<{ id?: string }> | undefined;
      const providerMessageId = messages?.[0]?.id;
      if (!providerMessageId) {
        return { ok: false, error: "Respuesta inesperada de Meta" };
      }

      return {
        ok: true,
        providerMessageId,
        status: "sent",
      };
    },
  };
}

function buildTextBody(to: string, body: string) {
  return {
    messaging_product: "WHATSAPP",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body },
  };
}

function buildTemplateBody(
  to: string,
  templateName: string,
  variables: string[],
) {
  return {
    messaging_product: "WHATSAPP",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: variables.map((text) => ({ type: "text", text })),
        },
      ],
    },
  };
}

function extractErrorMessage(
  data: Record<string, unknown>,
): string | undefined {
  const error = data.error as Record<string, unknown> | undefined;
  if (!error) return undefined;
  const message = error.message as string | undefined;
  const code = error.code as number | undefined;
  const subError = (error.error_subcode as number)?.toString();
  const parts = [message, code && `code ${code}`, subError && `sub ${subError}`]
    .filter(Boolean)
    .join(" · ");
  return parts || undefined;
}
