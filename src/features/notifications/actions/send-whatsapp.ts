"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { actionFail, actionOk, type ActionResult } from "@/types/action-result";
import { getAuthContext } from "@/features/auth/queries/get-auth-context";
import {
  APPOINTMENT_SELECT,
  mapAppointmentRow,
} from "@/features/appointments/queries/mapper";
import {
  createWhatsAppProvider,
  dispatchWhatsAppReminder,
} from "@/lib/notifications";

const sendReminderSchema = z.object({
  appointmentId: z.string().uuid(),
});

/**
 * Envía un recordatorio por WhatsApp para una cita.
 * Owner o la trabajadora asignada pueden enviarlo.
 */
export async function sendWhatsAppReminder(input: {
  appointmentId: string;
}): Promise<ActionResult<{ providerMessageId: string; mock: boolean }>> {
  const parsed = sendReminderSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("VALIDATION", "Cita inválida");
  }

  if (!(await rateLimit("sendWhatsAppReminder", { max: 10, windowSec: 60 }))) {
    return actionFail(
      "RATE_LIMITED",
      "Demasiados mensajes enviados. Espera un momento.",
    );
  }

  const auth = await getAuthContext();
  if (!auth) return actionFail("UNAUTHORIZED", "Inicia sesión de nuevo");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", parsed.data.appointmentId)
    .single();

  if (error || !data) {
    return actionFail(
      error?.code === "42501" ? "FORBIDDEN" : "NOT_FOUND",
      "Cita no encontrada",
    );
  }

  const appointment = mapAppointmentRow(data);

  const isOwner = auth.role === "owner";
  const isOwnWorker =
    auth.role === "worker" && auth.employeeId === appointment.employeeId;
  if (!isOwner && !isOwnWorker) {
    return actionFail(
      "FORBIDDEN",
      "No puedes enviar recordatorios de esta cita",
    );
  }

  if (process.env.WHATSAPP_PROVIDER === "meta") {
    if (
      !process.env.WHATSAPP_API_TOKEN ||
      !process.env.WHATSAPP_PHONE_NUMBER_ID
    ) {
      return actionFail(
        "VALIDATION",
        "WhatsApp Business API no está configurado. Revisa las variables de entorno.",
      );
    }
  }

  const provider = createWhatsAppProvider();
  const result = await dispatchWhatsAppReminder(
    supabase,
    {
      id: appointment.id,
      clientId: appointment.clientId,
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      clientWhatsapp: null, // AppointmentDTO no trae whatsapp; usamos phone.
      employeeName: appointment.employeeName,
      startsAt: appointment.startsAt,
    },
    provider,
  );

  if (!result.ok) {
    return actionFail("DB_ERROR", result.error);
  }

  return actionOk({
    providerMessageId: result.providerMessageId,
    mock: provider.name === "mock",
  });
}
