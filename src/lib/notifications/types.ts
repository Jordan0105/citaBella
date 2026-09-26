export type WhatsAppMessageStatus =
  "pending" | "sent" | "delivered" | "read" | "failed";

export interface WhatsAppMessageInput {
  /** Teléfono en formato E.164, ej. +50584123456. */
  phone: string;
  /** Cuerpo del mensaje (usado para texto libre o como fallback). */
  body: string;
  /** Nombre del template aprobado en Meta; si no hay, se envía texto libre. */
  templateName?: string;
  /** Variables del template en orden. */
  templateVariables?: string[];
  /** IDs opcionales para el log. */
  appointmentId?: string;
  clientId?: string;
  notificationId?: string;
}

interface SendOk {
  ok: true;
  providerMessageId: string;
  status: Extract<WhatsAppMessageStatus, "pending" | "sent">;
}

interface SendError {
  ok: false;
  error: string;
}

export type WhatsAppSendResult = SendOk | SendError;

export interface WhatsAppProvider {
  readonly name: string;
  send(input: WhatsAppMessageInput): Promise<WhatsAppSendResult>;
}

/** Limpia el "+" del E.164: Meta espera 50584123456. */
export function normalizeWhatsAppPhone(phone: string): string {
  return phone.replace(/^\+/, "").replace(/\s|-/g, "");
}
