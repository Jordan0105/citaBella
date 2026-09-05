import { z } from "zod";
import { phoneNicSchema } from "@/lib/phone";

const optionalPhone = z
  .union([phoneNicSchema, z.literal("")])
  .transform((v) => (v === "" ? null : v));

const optionalEmail = z
  .union([z.email("Correo inválido"), z.literal("")])
  .transform((v) => (v === "" ? null : v));

const optionalDate = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    z.literal(""),
  ])
  .transform((v) => (v === "" ? null : v))
  .refine(
    (v) => v === null || new Date(v) < new Date(),
    "La fecha de nacimiento no puede ser futura",
  );

export const clientSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(80, "Máximo 80 caracteres"),
  phone: phoneNicSchema,
  whatsapp: optionalPhone,
  email: optionalEmail,
  birthDate: optionalDate,
  notes: z
    .string()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .transform((v) => (v ? v : null)),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const clientIdSchema = z.object({
  id: z.string().uuid("Cliente inválido"),
});

export type ClientIdInput = z.infer<typeof clientIdSchema>;
