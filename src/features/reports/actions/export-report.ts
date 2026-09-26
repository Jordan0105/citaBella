"use server";

import * as XLSX from "xlsx";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { actionFail, actionOk, type ActionResult } from "@/types/action-result";
import {
  getReport,
  PERIOD_LABELS,
  type ReportPeriod,
} from "../queries/get-report";

const VALID_PERIODS: ReportPeriod[] = ["daily", "weekly", "monthly", "yearly"];

const refDateSchema = z.string().datetime().optional();

/**
 * Exporta el reporte del período a Excel. Usa la MISMA agregación que la
 * pantalla (getReport) — prohibido duplicar la lógica (agents/reporting.md).
 */
export async function exportReportExcel(
  period: string,
  refDateISO?: string,
): Promise<ActionResult<{ fileBase64: string; filename: string }>> {
  if (!(await rateLimit("exportReportExcel", { max: 5, windowSec: 60 }))) {
    return actionFail(
      "RATE_LIMITED",
      "Demasiadas exportaciones. Espera un momento.",
    );
  }

  if (!VALID_PERIODS.includes(period as ReportPeriod)) {
    return actionFail("VALIDATION", "Período inválido");
  }
  if (
    refDateISO !== undefined &&
    !refDateSchema.safeParse(refDateISO).success
  ) {
    return actionFail("VALIDATION", "Fecha de referencia inválida");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionFail("UNAUTHORIZED", "Inicia sesión de nuevo");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") {
    return actionFail("FORBIDDEN", "Solo la dueña puede exportar reportes");
  }

  const refDate = refDateISO ? new Date(refDateISO) : new Date();
  const report = await getReport(period as ReportPeriod, refDate);

  const summary: (string | number)[][] = [
    [
      `Reporte ${PERIOD_LABELS[period as ReportPeriod]} · ${report.fromDay} a ${report.toDay}`,
    ],
    [],
    [
      "Moneda",
      "Ingresos",
      "Propinas",
      "Gastos",
      "Neto",
      "Comisión trabajadoras",
      "Comisión dueña",
    ],
    ...report.totals.map((t) => [
      t.currency,
      t.income,
      t.tips,
      t.expenses,
      t.net,
      t.commissionsWorker,
      t.commissionsOwner,
    ]),
  ];

  const employees: (string | number)[][] = [
    ["Trabajadora", "Moneda", "Citas", "Ingresos generados", "Comisión"],
    ...report.byEmployee.map((e) => [
      e.employeeName,
      e.currency,
      e.appointmentsQty,
      e.revenue,
      e.commission,
    ]),
  ];

  const services: (string | number)[][] = [
    ["Servicio", "Moneda", "Cantidad", "Ingreso"],
    ...report.byService.map((s) => [
      s.serviceName,
      s.currency,
      s.qty,
      s.revenue,
    ]),
  ];

  const clients: (string | number)[][] = [
    ["Cliente", "Moneda", "Visitas", "Gasto"],
    ...report.byClient.map((c) => [
      c.clientName,
      c.currency,
      c.visits,
      c.spent,
    ]),
  ];

  const methods: (string | number)[][] = [
    ["Método", "Moneda", "Ingresos", "Gastos"],
    ...report.byMethod.map((m) => [m.method, m.currency, m.income, m.expenses]),
  ];

  const workbook = XLSX.utils.book_new();
  const add = (name: string, rows: (string | number)[][]) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  };
  add("Resumen", summary);
  add("Trabajadoras", employees);
  add("Servicios", services);
  add("Clientes", clients);
  add("Métodos", methods);

  const fileBase64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
  return actionOk({
    fileBase64,
    filename: `citabella-reporte-${period}-${report.fromDay}.xlsx`,
  });
}
