import { createClient } from "@/lib/supabase/server";
import { APPOINTMENT_SELECT, mapAppointmentRow } from "./mapper";
import type { AppointmentDTO, AppointmentsMeta } from "../types";

/** Citas por rango ISO (server). RLS filtra por rol; no se oculta nada a mano. */
export async function getAppointmentsInRange(
  fromISO: string,
  toISO: string,
): Promise<AppointmentDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .gte("starts_at", fromISO)
    .lte("starts_at", toISO)
    .order("starts_at");
  if (error) throw error;
  return (data ?? []).map(mapAppointmentRow);
}

/** Citas de hoy hacia adelante (lista /appointments). */
export async function getUpcomingAppointments(
  days = 7,
): Promise<AppointmentDTO[]> {
  const now = new Date();
  const to = new Date(now.getTime() + days * 86_400_000).toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", to)
    .order("starts_at");
  if (error) throw error;
  return (data ?? []).map(mapAppointmentRow);
}

/** Catálogos para el formulario de cita (server). */
export async function getAppointmentsMeta(): Promise<AppointmentsMeta> {
  const supabase = await createClient();
  const [clients, employees, services] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("employees")
      .select("id, full_name, color")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("services")
      .select("id, name, price_nio, price_usd, duration_minutes")
      .eq("is_active", true)
      .order("name"),
  ]);

  return {
    clients: (clients.data ?? []).map((c) => ({
      id: c.id,
      fullName: c.full_name,
    })),
    employees: (employees.data ?? []).map((e) => ({
      id: e.id,
      fullName: e.full_name,
      color: e.color,
    })),
    services: (services.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      priceNio: Number(s.price_nio),
      priceUsd: Number(s.price_usd),
      durationMinutes: s.duration_minutes,
    })),
  };
}
