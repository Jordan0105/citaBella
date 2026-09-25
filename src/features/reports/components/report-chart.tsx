"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import type { ReportData } from "../queries/get-report";

interface ReportChartProps {
  series: ReportData["series"];
}

/** Ingresos por día en NIO y USD (referencia), colores de la paleta CitaBella. */
export function ReportChart({ series }: ReportChartProps) {
  const byDay = new Map<string, { day: string; nio: number; usd: number }>();
  for (const row of series) {
    const entry = byDay.get(row.day) ?? {
      day: row.day.slice(5),
      nio: 0,
      usd: 0,
    };
    if (row.currency === "NIO") entry.nio += row.income;
    else entry.usd += row.income;
    byDay.set(row.day, entry);
  }
  const data = [...byDay.values()];

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sin ingresos en este período
      </p>
    );
  }

  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label="Gráfica de ingresos por día"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
          />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--card-foreground)",
            }}
            cursor={{ fill: "var(--chart-income-nio)", fillOpacity: 0.15 }}
            formatter={(value, name) => [
              formatMoney(Number(value), name === "USD" ? "USD" : "NIO"),
              name,
            ]}
          />
          <Legend />
          <Bar
            dataKey="nio"
            name="NIO"
            fill="var(--chart-income-nio)"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="usd"
            name="USD"
            fill="var(--chart-income-usd)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ReportChart;
