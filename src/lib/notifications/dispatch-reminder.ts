import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db.generated";
import { formatManaguaDate } from "@/lib/dates";
import {
  createWhatsAppProvider,
  normalizeWhatsAppPhone,
  type WhatsAppProvider,
} from "./index";

export interface DispatchAppointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientWhatsapp: string | null;
  employeeName: string;
  startsAt: string;
}

type Supabase = SupabaseClient<Database, "public">;

function buildReminderBody(appointment: DispatchAppointment): string {
  const when = formatManaguaDate(new Date(appointment.startsAt), "datetime");
  return `Hola ${appointment.clientName}, te recordamos tu cita en CitaBella el ${when} con ${appointment.employeeName}. ¡Te esperamos!`;
}

/**
 * Envía un recordatorio por WhatsApp para una cita y guarda el log.
 * Usado tanto desde la action manual como desde el cron.
 */
export async function dispatchWhatsAppReminder(
  supabase: Supabase,
  appointment: DispatchAppointment,
  provider: WhatsAppProvider = createWhatsAppProvider(),
): Promise<
  { ok: true; providerMessageId: string } | { ok: false; error: string }
> {
  const phone = appointment.clientWhatsapp ?? appointment.clientPhone;
  if (!phone) {
    return { ok: false, error: "El cliente no tiene teléfono registrado" };
  }

  const body = buildReminderBody(appointment);
  const result = await provider.send({
    phone: normalizeWhatsAppPhone(phone),
    body,
    appointmentId: appointment.id,
    clientId: appointment.clientId,
  });

  if (!result.ok) {
    await supabase.from("whatsapp_messages").insert({
      appointment_id: appointment.id,
      client_id: appointment.clientId,
      phone: normalizeWhatsAppPhone(phone),
      provider: provider.name,
      body,
      status: "failed",
      error_message: result.error,
    });
    return { ok: false, error: result.error };
  }

  const { error } = await supabase.from("whatsapp_messages").insert({
    appointment_id: appointment.id,
    client_id: appointment.clientId,
    phone: normalizeWhatsAppPhone(phone),
    provider: provider.name,
    provider_message_id: result.providerMessageId,
    body,
    status: result.status,
    sent_at: new Date().toISOString(),
  });

  if (error) {
    // El mensaje sí se envió, pero falló el log; lo reportamos para investigar.
    return {
      ok: false,
      error: "Mensaje enviado pero no se pudo guardar el registro",
    };
  }

  return { ok: true, providerMessageId: result.providerMessageId };
}
