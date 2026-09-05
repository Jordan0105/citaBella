import { z } from "zod";
import { phoneNicSchema } from "@/lib/phone";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const employeeSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(80, "Máximo 80 caracteres"),
  specialty: z
    .string()
    .trim()
    .max(60, "Máximo 60 caracteres")
    .optional()
    .transform((v) => (v ? v : null)),
  color: z
    .string()
    .trim()
    .regex(HEX_COLOR, "Color inválido (usa formato #RRGGBB)")
    .default("#B7A6E3"),
  /** % de la trabajadora; null = usar default del salón (55). */
  commissionPct: z
    .union([z.number().min(0).max(100), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : v)),
  phone: z
    .union([phoneNicSchema, z.literal("")])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  isActive: z.boolean().default(true),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

export const employeeIdSchema = z.object({
  id: z.string().uuid("Trabajadora inválida"),
});

export type EmployeeIdInput = z.infer<typeof employeeIdSchema>;

export interface AvailabilitySlot {
  weekday: number; // 0 = domingo … 6 = sábado
  startTime: string; // "HH:mm"
  endTime: string;
}

export const availabilitySchema = z.object({
  employeeId: z.string().uuid("Trabajadora inválida"),
  slots: z
    .array(
      z
        .object({
          weekday: z.number().int().min(0).max(6),
          startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
          endTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
        })
        .refine((s) => s.endTime > s.startTime, {
          message: "La hora final debe ser mayor a la inicial",
        }),
    )
    .max(7, "Máximo un horario por día"),
});

export type AvailabilityInput = z.infer<typeof availabilitySchema>;
