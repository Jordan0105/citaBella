import { z } from "zod";
import type { Json } from "@/types/db.generated";

const pct = z.number().min(0, "Entre 0 y 100").max(100, "Entre 0 y 100");
const timeHM = z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:mm)");

/** Claves editables y su schema — whitelist estricta (agents/security.md). */
export const SETTING_SCHEMAS = {
  default_commission_owner: z.object({ pct }),
  default_commission_worker: z.object({ pct }),
  exchange_rate: z.object({
    nio_per_usd: z.number().positive("La tasa debe ser mayor a 0"),
  }),
  business_hours: z.object({
    open: timeHM,
    close: timeHM,
    days: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Marca al menos un día"),
  }),
  salon_info: z.object({
    name: z.string().trim().min(2, "Nombre del salón requerido").max(80),
    phone: z.string().trim().max(20).optional(),
    address: z.string().trim().max(160).optional(),
  }),
  default_currency: z.object({ code: z.enum(["NIO", "USD"]) }),
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;

export const SETTING_KEYS = Object.keys(SETTING_SCHEMAS) as SettingKey[];

export function isSettingKey(key: string): key is SettingKey {
  return key in SETTING_SCHEMAS;
}

/** Valida y normaliza el valor al shape Json que espera la tabla settings. */
export function validateSetting(key: SettingKey, value: unknown): Json | null {
  const result = SETTING_SCHEMAS[key].safeParse(value);
  return result.success ? (result.data as Json) : null;
}

export interface SalonSettings {
  defaultCommissionOwner: number;
  defaultCommissionWorker: number;
  exchangeRate: number;
  defaultCurrency: "NIO" | "USD";
  businessHours: { open: string; close: string; days: number[] } | null;
  salonInfo: { name: string; phone?: string; address?: string } | null;
}
