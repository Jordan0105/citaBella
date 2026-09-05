import { z } from "zod";
import { moneySchema } from "@/lib/money";

export const currencySchema = z.enum(["NIO", "USD"]);

export const createAppointmentSchema = z
  .object({
    clientId: z.string().min(1, "Selecciona un cliente"),
    employeeId: z.string().min(1, "Selecciona una trabajadora"),
    serviceIds: z
      .array(z.string().min(1))
      .min(1, "Selecciona al menos un servicio"),
    /** ISO UTC (pared Managua). */
    startsAt: z.string().min(1, "Selecciona fecha y hora"),
    /** ISO UTC; si se omite se calcula con la duración de los servicios. */
    endsAt: z.string().optional(),
    currency: currencySchema,
    discount: moneySchema.refine(
      (v) => v >= 0,
      "El descuento no puede ser negativo",
    ),
    notes: z.string().max(500, "Máximo 500 caracteres").optional(),
  })
  .refine(
    (data) =>
      new Date(data.endsAt ?? "") > new Date(data.startsAt) || !data.endsAt,
    {
      message: "La hora final debe ser mayor a la inicial",
      path: ["endsAt"],
    },
  );

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  id: z.string().uuid("Cita inválida"),
  status: z.enum(["confirmed", "in_progress", "cancelled"]),
});

export type UpdateAppointmentStatusInput = z.infer<
  typeof updateAppointmentStatusSchema
>;

export const rescheduleAppointmentSchema = z
  .object({
    id: z.string().uuid("Cita inválida"),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "La hora final debe ser mayor a la inicial",
    path: ["endsAt"],
  });

export type RescheduleAppointmentInput = z.infer<
  typeof rescheduleAppointmentSchema
>;

export const cancelAppointmentSchema = z.object({
  id: z.string().uuid("Cita inválida"),
  reason: z
    .string()
    .trim()
    .min(3, "Escribe el motivo de la cancelación")
    .max(300),
});

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const finalizeAppointmentSchema = z.object({
  id: z.string().uuid("Cita inválida"),
  method: z.enum(["cash", "transfer", "card"]),
  tip: moneySchema.refine((v) => v >= 0, "La propina no puede ser negativa"),
});

export type FinalizeAppointmentInput = z.infer<
  typeof finalizeAppointmentSchema
>;
