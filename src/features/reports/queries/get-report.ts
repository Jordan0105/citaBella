import { createClient } from "@/lib/supabase/server";
import {
  endOfManaguaDay,
  endOfManaguaMonth,
  endOfManaguaWeek,
  endOfManaguaYear,
  getManaguaParts,
  startOfManaguaDay,
  startOfManaguaMonth,
  startOfManaguaWeek,
  startOfManaguaYear,
} from "@/lib/dates";
import type {
  MyReportData,
  ReportData,
  ReportPeriod,
  ReportTotals,
} from "../types";

export { PERIOD_LABELS } from "../types";
export type { ReportData, ReportPeriod, ReportTotals } from "../types";

type Row = Record<string, unknown>;

/** Rango de días (YYYY-MM-DD en Managua) que cubre un período. */
export function periodDayRange(
  period: ReportPeriod,
  refDate = new Date(),
): { fromDay: string; toDay: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const toDays = (start: Date, end: Date) => {
    const a = getManaguaParts(start);
    const b = getManaguaParts(end);
    return {
      fromDay: `${a.year}-${pad(a.month)}-${pad(a.day)}`,
      toDay: `${b.year}-${pad(b.month)}-${pad(b.day)}`,
    };
  };

  switch (period) {
    case "daily":
      return toDays(startOfManaguaDay(refDate), endOfManaguaDay(refDate));
    case "weekly":
      return toDays(startOfManaguaWeek(refDate), endOfManaguaWeek(refDate));
    case "monthly":
      return toDays(startOfManaguaMonth(refDate), endOfManaguaMonth(refDate));
    case "yearly":
      return toDays(startOfManaguaYear(refDate), endOfManaguaYear(refDate));
  }
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function groupSum(
  rows: Row[],
  keyFields: string[],
  sumFields: string[],
): Map<string, Record<string, string | number>> {
  const map = new Map<string, Record<string, string | number>>();
  for (const row of rows) {
    const key = keyFields.map((k) => String(row[k])).join("|");
    const agg = map.get(key) ?? {};
    for (const field of sumFields) {
      agg[field] = (num(agg[field]) || 0) + num(row[field]);
    }
    for (const k of keyFields) agg[k] = String(row[k]);
    map.set(key, agg);
  }
  return map;
}

/** Reporte del período (owner; RLS excluye a los demás roles). */
export async function getReport(
  period: ReportPeriod,
  refDate = new Date(),
): Promise<ReportData> {
  const supabase = await createClient();
  const { fromDay, toDay } = periodDayRange(period, refDate);

  const [revenue, close, commissions, services, employees, clients] =
    await Promise.all([
      supabase
        .from("v_daily_revenue")
        .select("*")
        .gte("day", fromDay)
        .lte("day", toDay),
      supabase
        .from("v_cash_close")
        .select("*")
        .gte("day", fromDay)
        .lte("day", toDay),
      supabase
        .from("v_daily_commissions")
        .select("*")
        .gte("day", fromDay)
        .lte("day", toDay),
      supabase
        .from("v_service_revenue")
        .select("*")
        .gte("day", fromDay)
        .lte("day", toDay),
      supabase
        .from("v_employee_revenue")
        .select("*")
        .gte("day", fromDay)
        .lte("day", toDay),
      supabase
        .from("v_client_revenue")
        .select("*")
        .gte("day", fromDay)
        .lte("day", toDay),
    ]);
  for (const q of [revenue, close, commissions, services, employees, clients]) {
    if (q.error) throw q.error;
  }

  // Totales por moneda
  const totalsMap = new Map<string, ReportTotals>();
  const totalsFor = (currency: string): ReportTotals => {
    const existing = totalsMap.get(currency);
    if (existing) return existing;
    const fresh: ReportTotals = {
      currency: currency as ReportTotals["currency"],
      income: 0,
      tips: 0,
      expenses: 0,
      net: 0,
      commissionsWorker: 0,
      commissionsOwner: 0,
    };
    totalsMap.set(currency, fresh);
    return fresh;
  };

  for (const row of revenue.data ?? []) {
    const t = totalsFor(String(row.currency));
    t.income += num(row.income);
    t.tips += num(row.tips);
  }
  for (const row of close.data ?? []) {
    const t = totalsFor(String(row.currency));
    t.expenses += num(row.expenses);
  }
  for (const row of commissions.data ?? []) {
    const t = totalsFor(String(row.currency));
    t.commissionsWorker += num(row.employee_amount);
    t.commissionsOwner += num(row.owner_amount);
  }
  const totals = [...totalsMap.values()].map((t) => ({
    ...t,
    net: t.income - t.expenses,
  }));

  // Por método de pago
  const byMethod = [
    ...groupSum(
      close.data ?? [],
      ["method", "currency"],
      ["income", "expenses"],
    ).values(),
  ]
    .map((agg) => ({
      method: String(agg.method),
      currency: String(agg.currency),
      income: Number(agg.income),
      expenses: Number(agg.expenses),
    }))
    .sort((a, b) => b.income - a.income);

  // Por trabajadora
  const byEmployee = [
    ...groupSum(
      employees.data ?? [],
      ["employee_name", "currency"],
      ["revenue", "commission", "appointments_qty"],
    ).values(),
  ]
    .map((agg) => ({
      employeeName: String(agg.employee_name),
      currency: String(agg.currency),
      appointmentsQty: Number(agg.appointments_qty),
      revenue: Number(agg.revenue),
      commission: Number(agg.commission),
    }))
    .sort((a, b) => b.commission - a.commission);

  // Por servicio
  const byService = [
    ...groupSum(
      services.data ?? [],
      ["service_name", "currency"],
      ["qty", "revenue"],
    ).values(),
  ]
    .map((agg) => ({
      serviceName: String(agg.service_name),
      currency: String(agg.currency),
      qty: Number(agg.qty),
      revenue: Number(agg.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Por cliente
  const byClient = [
    ...groupSum(
      clients.data ?? [],
      ["client_name", "currency"],
      ["visits", "spent"],
    ).values(),
  ]
    .map((agg) => ({
      clientName: String(agg.client_name),
      currency: String(agg.currency),
      visits: Number(agg.visits),
      spent: Number(agg.spent),
    }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 10);

  // Serie diaria (para la gráfica)
  const seriesMap = groupSum(
    [...(revenue.data ?? []), ...(close.data ?? [])],
    ["day", "currency"],
    ["income", "tips", "expenses"],
  );
  const series = [...seriesMap.values()]
    .map((agg) => ({
      day: String(agg.day),
      currency: String(agg.currency),
      income: Number(agg.income ?? 0),
      tips: Number(agg.tips ?? 0),
      expenses: Number(agg.expenses ?? 0),
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return {
    period,
    fromDay,
    toDay,
    totals,
    byMethod,
    byEmployee,
    byService,
    byClient,
    series,
  };
}

/** Reporte personal de la trabajadora (RLS: solo sus comisiones). */
export async function getMyReport(
  period: ReportPeriod,
  refDate = new Date(),
): Promise<MyReportData> {
  const supabase = await createClient();
  const { fromDay, toDay } = periodDayRange(period, refDate);

  const { data, error } = await supabase
    .from("v_daily_commissions")
    .select("*")
    .gte("day", fromDay)
    .lte("day", toDay);
  if (error) throw error;

  const byDay = groupSum(
    data ?? [],
    ["day", "currency"],
    ["employee_amount", "appointments_qty"],
  );
  let totalCommission = 0;
  let appointmentsQty = 0;
  let currency = "NIO";
  const days: { day: string; commission: number }[] = [];
  for (const agg of byDay.values()) {
    totalCommission += Number(agg.employee_amount ?? 0);
    appointmentsQty += Number(agg.appointments_qty ?? 0);
    currency = String(agg.currency);
    days.push({
      day: String(agg.day),
      commission: Number(agg.employee_amount ?? 0),
    });
  }
  days.sort((a, b) => a.day.localeCompare(b.day));

  return {
    period,
    fromDay,
    toDay,
    totalCommission,
    currency,
    appointmentsQty,
    days,
  };
}
