import { z } from "zod";
import { moneySchema } from "@/lib/money";

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(80, "Máximo 80 caracteres"),
  description: z
    .string()
    .trim()
    .max(300, "Máximo 300 caracteres")
    .optional()
    .transform((v) => (v ? v : null)),
  priceNio: moneySchema.refine((v) => v > 0, "El precio debe ser mayor a 0"),
  priceUsd: moneySchema.refine((v) => v > 0, "El precio debe ser mayor a 0"),
  durationMinutes: z
    .number()
    .int("Duración en minutos enteros")
    .min(5, "Mínimo 5 minutos")
    .max(480, "Máximo 8 horas"),
  /** Override de comisión de la trabajadora; null = usar el default. */
  commissionPct: z
    .union([z.number().min(0).max(100), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : v)),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

export const serviceIdSchema = z.object({
  id: z.string().uuid("Servicio inválido"),
});

export type ServiceIdInput = z.infer<typeof serviceIdSchema>;
