"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  actionFail,
  actionOk,
  fieldErrorsOf,
  type ActionResult,
} from "@/types/action-result";
import {
  cancelAppointmentSchema,
  finalizeAppointmentSchema,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
  type CancelAppointmentInput,
  type FinalizeAppointmentInput,
  type RescheduleAppointmentInput,
  type UpdateAppointmentStatusInput,
} from "../schemas/appointment";
import type { AppointmentDTO, AppointmentReceiptDTO } from "../types";
import { APPOINTMENT_SELECT, mapAppointmentRow } from "../queries/mapper";
import type { AppointmentRow } from "../queries/mapper";

const CALENDAR_PATHS = ["/calendar", "/appointments", "/dashboard"] as const;

function revalidateAll() {
  for (const path of CALENDAR_PATHS) revalidatePath(path);
}

function mapRpcError(message: string): {
  code: Parameters<typeof actionFail>[0];
  message: string;
} {
  const map: [string, Parameters<typeof actionFail>[0], string][] = [
    [
      "APPOINTMENT_ALREADY_COMPLETED",
      "CONFLICT",
      "Esta cita ya está finalizada",
    ],
    ["APPOINTMENT_CANCELLED", "CONFLICT", "Esta cita está cancelada"],
    ["APPOINTMENT_TERMINAL", "CONFLICT", "Esta cita ya no puede modificarse"],
    [
      "APPOINTMENT_NOT_CANCELLABLE",
      "CONFLICT",
      "Solo se pueden cancelar citas pendientes o confirmadas",
    ],
    [
      "SLOT_TAKEN",
      "SLOT_TAKEN",
      "Ya existe una cita para esta trabajadora en ese horario",
    ],
    [
      "OUT_OF_SCHEDULE",
      "OUT_OF_SCHEDULE",
      "Fuera del horario laboral o en día bloqueado",
    ],
    ["NOT_FOUND", "NOT_FOUND", "Cita no encontrada"],
    ["UNAUTHORIZED", "UNAUTHORIZED", "Inicia sesión de nuevo"],
    ["VALIDATION", "VALIDATION", "Datos inválidos"],
  ];
  for (const [needle, code, human] of map) {
    if (message.includes(needle)) {
      const detail = message.match(/'[^']*?:\s*([^']*)'/)?.[1]?.trim();
      return {
        code,
        message:
          needle === message.trim()
            ? human
            : detail && detail.length > 0
              ? detail
              : human,
      };
    }
  }
  return { code: "DB_ERROR", message: message };
}

/** Confirma o inicia una cita (transición pendiente→confirmada→en proceso). */
export async function updateAppointmentStatus(
  input: UpdateAppointmentStatusInput,
): Promise<ActionResult<AppointmentDTO>> {
  if (
    !(await rateLimit("updateAppointmentStatus", { max: 40, windowSec: 60 }))
  ) {
    return actionFail(
      "RATE_LIMITED",
      "Demasiadas operaciones. Espera un momento.",
    );
  }

  const parsed = updateAppointmentStatusSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("appointments")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select(APPOINTMENT_SELECT)
    .single();

  if (error) {
    if (error.code === "P0001") {
      return actionFail("CONFLICT", mapRpcError(error.message).message);
    }
    return actionFail(
      error.code === "42501" ? "FORBIDDEN" : "DB_ERROR",
      humanRlsError(error.message),
    );
  }

  revalidateAll();
  return actionOk(mapAppointmentRow(updated));
}

/** Reprograma vía RPC (valida conflicto + horario en DB). */
export async function rescheduleAppointment(
  input: RescheduleAppointmentInput,
): Promise<ActionResult<AppointmentDTO>> {
  if (!(await rateLimit("rescheduleAppointment", { max: 30, windowSec: 60 }))) {
    return actionFail(
      "RATE_LIMITED",
      "Demasiadas operaciones. Espera un momento.",
    );
  }

  const parsed = rescheduleAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: parsed.data.id,
    p_start: parsed.data.startsAt,
    p_end: parsed.data.endsAt,
  });

  if (error) {
    const mapped = mapRpcError(error.message);
    return actionFail(mapped.code, mapped.message);
  }

  revalidateAll();
  const { data: full, error: fetchError } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", (data as { id: string }).id)
    .single();

  if (!full) {
    // La reprogramación sí ocurrió; fallback: mapear la fila del RPC.
    return actionOk(
      mapAppointmentRow({
        ...(data as unknown as AppointmentRow),
        client: null,
        employee: null,
      }),
    );
  }
  if (fetchError) {
    return actionFail("DB_ERROR", "Cita reprogramada pero no se pudo leer");
  }
  return actionOk(mapAppointmentRow(full));
}

/**
 * Finaliza una cita ("Cita realizada"): el RPC genera ingreso + comisiones
 * con snapshot en UNA transacción. Propina fuera de la base de comisión.
 */
export async function finalizeAppointment(
  input: FinalizeAppointmentInput,
): Promise<ActionResult<AppointmentReceiptDTO>> {
  if (!(await rateLimit("finalizeAppointment", { max: 20, windowSec: 60 }))) {
    return actionFail(
      "RATE_LIMITED",
      "Demasiadas operaciones. Espera un momento.",
    );
  }

  const parsed = finalizeAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_appointment", {
    p_appointment_id: parsed.data.id,
    p_method: parsed.data.method,
    p_tip: parsed.data.tip,
  });

  if (error) {
    const mapped = mapRpcError(error.message);
    return actionFail(mapped.code, mapped.message);
  }

  revalidateAll();
  revalidatePath("/finance");
  return actionOk({
    appointmentId: (data as { appointment_id: string }).appointment_id,
    amount: Number((data as { amount: number }).amount),
    tip: Number((data as { tip: number }).tip),
    currency: (data as { currency: AppointmentReceiptDTO["currency"] })
      .currency,
    exchangeRate: Number((data as { exchange_rate: number }).exchange_rate),
    method: (data as { method: AppointmentReceiptDTO["method"] }).method,
    completedAt: (data as { completed_at: string }).completed_at,
  });
}

/** Cancela con motivo (solo pendiente/confirmada). */
export async function cancelAppointment(
  input: CancelAppointmentInput,
): Promise<ActionResult<AppointmentDTO>> {
  if (!(await rateLimit("cancelAppointment", { max: 30, windowSec: 60 }))) {
    return actionFail(
      "RATE_LIMITED",
      "Demasiadas operaciones. Espera un momento.",
    );
  }

  const parsed = cancelAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_appointment", {
    p_appointment_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });

  if (error) {
    const mapped = mapRpcError(error.message);
    return actionFail(mapped.code, mapped.message);
  }

  revalidateAll();
  const { data: full, error: fetchError } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", (data as { id: string }).id)
    .single();

  if (!full) {
    // La cancelación sí ocurrió; fallback: mapear la fila del RPC.
    return actionOk(
      mapAppointmentRow({
        ...(data as unknown as AppointmentRow),
        client: null,
        employee: null,
      }),
    );
  }
  if (fetchError) {
    return actionFail("DB_ERROR", "Cita cancelada pero no se pudo leer");
  }
  return actionOk(mapAppointmentRow(full));
}

function humanRlsError(message: string): string {
  if (message.includes("row-level security")) {
    return "No tienes permisos para esta operación";
  }
  return message;
}
