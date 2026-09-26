"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import { PERIOD_LABELS, type ReportData, type ReportPeriod } from "../types";
import { exportReportExcel } from "../actions/export-report";

const ReportChart = dynamic(() => import("./report-chart"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" />,
});

const PERIODS: ReportPeriod[] = ["daily", "weekly", "monthly", "yearly"];

interface ReportViewProps {
  report: ReportData;
  period: ReportPeriod;
  refDateISO: string;
}

export function ReportView({ report, period, refDateISO }: ReportViewProps) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  function setPeriod(next: ReportPeriod) {
    router.push(`/reports?period=${next}`);
  }

  async function handleExport() {
    setExporting(true);
    const result = await exportReportExcel(period, refDateISO);
    setExporting(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    const bytes = Uint8Array.from(atob(result.data.fileBase64), (c) =>
      c.charCodeAt(0),
    );
    const blob = new Blob([bytes], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Reporte exportado");
  }

  const nio = report.totals.find((t) => t.currency === "NIO");
  const usd = report.totals.find((t) => t.currency === "USD");

  return (
    <div className="space-y-6">
      <div
        className="no-print flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Período del reporte"
      >
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
              period === p
                ? "border-primary bg-primary/10 text-bella-700 dark:text-bella-300"
                : "border-input text-muted-foreground hover:bg-accent"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {report.fromDay} → {report.toDay}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={`Ingresos · ${PERIOD_LABELS[period]}`}
          value={formatMoney(nio?.income ?? 0, "NIO")}
          hint={usd ? `+ ${formatMoney(usd.income, "USD")}` : undefined}
        />
        <MetricCard
          label="Propinas"
          value={formatMoney(nio?.tips ?? 0, "NIO")}
          hint={usd ? `+ ${formatMoney(usd.tips, "USD")}` : undefined}
        />
        <MetricCard
          label="Gastos"
          value={formatMoney(nio?.expenses ?? 0, "NIO")}
          hint={usd ? `+ ${formatMoney(usd.expenses, "USD")}` : undefined}
        />
        <MetricCard
          label="Neto"
          value={formatMoney(nio?.net ?? 0, "NIO")}
          hint={usd ? `+ ${formatMoney(usd.net, "USD")}` : undefined}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Comisiones · trabajadoras"
          value={formatMoney(nio?.commissionsWorker ?? 0, "NIO")}
          hint={
            usd ? `+ ${formatMoney(usd.commissionsWorker, "USD")}` : undefined
          }
        />
        <MetricCard
          label="Comisiones · dueña"
          value={formatMoney(nio?.commissionsOwner ?? 0, "NIO")}
          hint={
            usd ? `+ ${formatMoney(usd.commissionsOwner, "USD")}` : undefined
          }
        />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Ingresos por día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReportChart series={report.series} />
        </CardContent>
      </Card>

      <div className="no-print flex flex-wrap gap-2">
        <Button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-full"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
          )}
          Exportar Excel
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" aria-hidden />
          Imprimir / PDF
        </Button>
      </div>

      <ReportTable
        title="Por trabajadora"
        headers={["Trabajadora", "Citas", "Ingresos", "Comisión"]}
        rows={report.byEmployee.map((e) => [
          e.employeeName,
          String(e.appointmentsQty),
          formatMoney(e.revenue, e.currency as CurrencyCode),
          formatMoney(e.commission, e.currency as CurrencyCode),
        ])}
      />

      <ReportTable
        title="Servicios más vendidos"
        headers={["Servicio", "Cantidad", "Ingreso"]}
        rows={report.byService.map((s) => [
          s.serviceName,
          String(s.qty),
          formatMoney(s.revenue, s.currency as CurrencyCode),
        ])}
      />

      <ReportTable
        title="Top clientes"
        headers={["Cliente", "Visitas", "Gasto"]}
        rows={report.byClient.map((c) => [
          c.clientName,
          String(c.visits),
          formatMoney(c.spent, c.currency as CurrencyCode),
        ])}
      />

      <ReportTable
        title="Por método de pago"
        headers={["Método", "Ingresos", "Gastos"]}
        rows={report.byMethod.map((m) => [
          m.method,
          formatMoney(m.income, m.currency as CurrencyCode),
          formatMoney(m.expenses, m.currency as CurrencyCode),
        ])}
      />
    </div>
  );
}

function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="font-display text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin datos en este período
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                {headers.map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`px-3 py-2 font-medium ${i > 0 ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b last:border-0">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 ${ci > 0 ? "text-right tabular-nums" : "font-medium"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
