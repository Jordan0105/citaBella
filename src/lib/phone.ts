import { z } from "zod";

/**
 * Teléfono de Nicaragua: 8 dígitos iniciando en 2 (fijo), 7 u 8 (móvil),
 * con prefijo +505 opcional. Acepta separadores comunes ("8412-3456",
 * "+505 8412 3456", "84123456").
 */
export const NIC_PHONE_PATTERN = /^(\+?505)?[278]\d{7}$/;

const STRIPPABLE = /[\s\-().]/g;

export function isValidNicPhone(raw: string): boolean {
  return NIC_PHONE_PATTERN.test(raw.replace(STRIPPABLE, ""));
}

/** Normaliza a formato E.164 local: "+50584123456". */
export function normalizeNicPhone(raw: string): string {
  const cleaned = raw.replace(STRIPPABLE, "").replace(/\+/g, "");
  if (cleaned.startsWith("505")) return `+${cleaned}`;
  return `+505${cleaned}`;
}

/** Formato de presentación: "+505 8412 3456". */
export function formatNicPhone(raw: string): string {
  const normalized = normalizeNicPhone(raw);
  const local = normalized.replace("+505", "");
  return `+505 ${local.slice(0, 4)} ${local.slice(4)}`;
}

/** Schema Zod canónico: valida y devuelve el teléfono normalizado. */
export const phoneNicSchema = z
  .string()
  .trim()
  .refine(
    (v) => isValidNicPhone(v),
    "Teléfono inválido: usa 8 dígitos que inicien con 2, 7 u 8",
  )
  .transform((v) => normalizeNicPhone(v));
