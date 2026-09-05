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
  createAppointmentSchema,
  type CreateAppointmentInput,
} from "../schemas/appointment";
import type { AppointmentDTO } from "../types";
import { APPOINTMENT_SELECT, mapAppointmentRow } from "../queries/mapper";

/**
 * Crea una cita vía RPC transaccional: conflicto de horario, disponibilidad,
 * bloqueos y líneas de servicio se validan EN LA BASE DE DATOS.
 * SLOT_TAKEN / OUT_OF_SCHEDULE son errores DB, no del formulario.
 */
export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<ActionResult<AppointmentDTO>> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  if (!(await rateLimit("createAppointment", { max: 30, windowSec: 60 }))) {
    return actionFail(
      "RATE_LIMITED",
      "Demasiadas operaciones. Espera un momento.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionFail("UNAUTHORIZED", "Inicia sesión de nuevo");

  // Precios y duraciones SIEMPRE del catálogo (fuente de verdad servidor)
  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name, price_nio, price_usd, duration_minutes")
    .in("id", parsed.data.serviceIds)
    .eq("is_active", true);

  if (
    servicesError ||
    !services ||
    services.length !== parsed.data.serviceIds.length
  ) {
    return actionFail(
      "VALIDATION",
      "Uno o más servicios no existen o están inactivos",
    );
  }

  const lines = services.map((s) => ({
    service_id: s.id,
    price:
      parsed.data.currency === "NIO"
        ? Number(s.price_nio)
        : Number(s.price_usd),
    discount: 0,
    duration_minutes: s.duration_minutes,
  }));

  const total = lines.reduce((sum, line) => sum + line.price, 0);
  const totalDuration = lines.reduce(
    (sum, line) => sum + line.duration_minutes,
    0,
  );

  if (parsed.data.discount > total) {
    return actionFail("VALIDATION", "El descuento no puede superar el precio", {
      discount: ["El descuento no puede superar el precio"],
    });
  }

  const endsAt =
    parsed.data.endsAt ??
    new Date(
      new Date(parsed.data.startsAt).getTime() + totalDuration * 60_000,
    ).toISOString();

  const { data, error } = await supabase.rpc("create_appointment_safe", {
    p_input: {
      client_id: parsed.data.clientId,
      employee_id: parsed.data.employeeId,
      service_id: lines[0]?.service_id ?? null,
      starts_at: parsed.data.startsAt,
      ends_at: endsAt,
      currency: parsed.data.currency,
      price: total,
      discount: parsed.data.discount,
      exchange_rate: null, // el RPC toma el snapshot del día para USD
      notes: parsed.data.notes ?? null,
      services: lines,
    },
  });

  if (error) {
    return actionFail(
      mapRpcErrorCode(error.message),
      humanizeRpcError(error.message),
    );
  }

  revalidatePath("/calendar");
  revalidatePath("/appointments");
  revalidatePath("/dashboard");

  const appointment = data as { appointment: { id: string } };
  const { data: full } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", appointment.appointment.id)
    .single();

  return actionOk(mapAppointmentRow(full));
}

function mapRpcErrorCode(message: string): Parameters<typeof actionFail>[0] {
  if (message.includes("SLOT_TAKEN")) return "SLOT_TAKEN";
  if (message.includes("OUT_OF_SCHEDULE")) return "OUT_OF_SCHEDULE";
  if (message.includes("UNAUTHORIZED")) return "UNAUTHORIZED";
  if (message.includes("NOT_FOUND")) return "NOT_FOUND";
  return "DB_ERROR";
}

function humanizeRpcError(message: string): string {
  const match = message.match(/'[^']*?:\s*([^']*)'/);
  const detail = match?.[1]?.trim();
  return detail && detail.length > 0 ? detail : message;
}
