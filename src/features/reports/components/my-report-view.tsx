import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { MyReportData } from "../types";

/** Reporte personal de la trabajadora: solo sus comisiones (RLS). */
export function MyReportView({ report }: { report: MyReportData }) {
  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Mis comisiones · {report.fromDay} → {report.toDay}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-display text-4xl tabular-nums">
            {formatMoney(
              report.totalCommission,
              report.currency === "USD" ? "USD" : "NIO",
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.appointmentsQty} citas realizadas en este período
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Detalle por día
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.days.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin comisiones en este período
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.days.map((day) => (
                <li
                  key={day.day}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <span>{day.day}</span>
                  <span className="tabular-nums">
                    {formatMoney(
                      day.commission,
                      report.currency === "USD" ? "USD" : "NIO",
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
