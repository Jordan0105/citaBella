import { createClient } from "@/lib/supabase/server";
import {
  endOfManaguaDay,
  startOfManaguaDay,
  startOfManaguaMonth,
} from "@/lib/dates";
import {
  APPOINTMENT_SELECT,
  mapAppointmentRow,
} from "@/features/appointments/queries/mapper";
import type {
  AppointmentDTO,
  AppointmentsMeta,
} from "@/features/appointments/types";

function managuaToday(): string {
  return new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Citas de hoy (RLS filtra por rol: worker solo ve las suyas). */
export async function getTodayAppointments(): Promise<AppointmentDTO[]> {
  const now = new Date();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .gte("starts_at", startOfManaguaDay(now).toISOString())
    .lte("starts_at", endOfManaguaDay(now).toISOString())
    .order("starts_at");
  if (error) throw error;
  return (data ?? []).map(mapAppointmentRow);
}

/** Próximas citas (siguientes 24 h). */
export async function getNextAppointments(
  limit = 5,
): Promise<AppointmentDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .gte("starts_at", new Date().toISOString())
    .lte("starts_at", new Date(Date.now() + 86_400_000).toISOString())
    .order("starts_at")
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapAppointmentRow);
}

export interface RevenueByCurrency {
  currency: "NIO" | "USD";
  income: number;
  tips: number;
}

/** Ingresos de hoy por moneda (v_daily_revenue, owner vía RLS). */
export async function getTodayRevenue(): Promise<RevenueByCurrency[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_daily_revenue")
    .select("*")
    .eq("day", managuaToday());
  if (error) throw error;
  return (data ?? []).map((row) => ({
    currency: row.currency as "NIO" | "USD",
    income: Number(row.income),
    tips: Number(row.tips),
  }));
}

export interface MonthRevenue {
  currency: "NIO" | "USD";
  income: number;
  expenses: number;
  commissionsWorker: number;
  commissionsOwner: number;
}

/** Resumen del mes en curso (v_monthly_revenue). */
export async function getMonthRevenue(): Promise<MonthRevenue[]> {
  const supabase = await createClient();
  const monthStart = startOfManaguaMonth(new Date()).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("v_monthly_revenue")
    .select("*")
    .gte("month", monthStart)
    .lte("month", monthStart);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    currency: row.currency as "NIO" | "USD",
    income: Number(row.income),
    expenses: Number(row.expenses),
    commissionsWorker: Number(row.commissions_worker),
    commissionsOwner: Number(row.commissions_owner),
  }));
}

export interface TopService {
  serviceName: string;
  qty: number;
  revenue: number;
  currency: string;
}

/** Servicios más vendidos del mes (v_service_revenue, grano día). */
export async function getTopServicesMonth(limit = 5): Promise<TopService[]> {
  const supabase = await createClient();
  const monthStart = startOfManaguaMonth(new Date()).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("v_service_revenue")
    .select("*")
    .gte("day", monthStart);
  if (error) throw error;

  const map = new Map<string, TopService>();
  for (const row of data ?? []) {
    const key = `${row.service_name}|${row.currency}`;
    const agg = map.get(key) ?? {
      serviceName: row.service_name as string,
      qty: 0,
      revenue: 0,
      currency: row.currency as string,
    };
    agg.qty += Number(row.qty);
    agg.revenue += Number(row.revenue);
    map.set(key, agg);
  }
  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export interface MyCommissionsMonth {
  total: number;
  appointmentsQty: number;
  currency: string;
}

/** Comisiones propias del mes (worker; RLS filtra por employee_id). */
export async function getMyCommissionsMonth(): Promise<MyCommissionsMonth> {
  const supabase = await createClient();
  const monthStart = startOfManaguaMonth(new Date()).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("v_daily_commissions")
    .select("*")
    .gte("day", monthStart);
  if (error) throw error;

  let total = 0;
  let appointmentsQty = 0;
  let currency = "NIO";
  for (const row of data ?? []) {
    total += Number(row.employee_amount);
    appointmentsQty += Number(row.appointments_qty);
    currency = String(row.currency);
  }
  return { total, appointmentsQty, currency };
}

/** Meta ya cargada (catálogos) para widgets interactivos si se necesita. */
export type DashboardMeta = AppointmentsMeta;
