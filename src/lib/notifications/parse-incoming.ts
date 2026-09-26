import { normalizeWhatsAppPhone } from "./types";

export type ConfirmationIntent = "confirmed" | "cancelled" | null;

const CONFIRM_WORDS = new Set([
  "confirmo",
  "confirma",
  "confirmar",
  "confirmada",
  "confirmado",
  "sí",
  "si",
  "ok",
  "vale",
  "listo",
  "lista",
  "dale",
  "perfecto",
]);

const CANCEL_WORDS = new Set([
  "cancelo",
  "cancela",
  "cancelar",
  "cancelada",
  "cancelado",
  "no",
  "nop",
  "no puedo",
  "paso",
  "pasar",
  "reprogramar",
]);

/**
 * Extrae la intención de confirmación/cancelación de un mensaje entrante.
 * Reglas simples de Nicaragua (es-NI), case-insensitive, ignorando puntuación.
 */
export function parseConfirmationResponse(text: string): ConfirmationIntent {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/[¡!?.¿,:;]+/g, " ");

  const words = normalized.split(/\s+/);

  // Palabras completas primero (evitar que "no" en "no puedo" gane sobre "ok")
  for (const phrase of [normalized, ...words]) {
    if (CANCEL_WORDS.has(phrase)) return "cancelled";
  }
  for (const phrase of [normalized, ...words]) {
    if (CONFIRM_WORDS.has(phrase)) return "confirmed";
  }

  return null;
}

/**
 * Normaliza el número que envía Meta ( Ej: "50584123456" ) al formato usado
 * en la base de datos.
 */
export { normalizeWhatsAppPhone };
