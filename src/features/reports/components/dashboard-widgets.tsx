import { Check, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatManaguaDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { AppointmentDTO } from "@/features/appointments/types";

function AppointmentMiniList({
  appointments,
  emptyLabel,
}: {
  appointments: AppointmentDTO[];
  emptyLabel: string;
}) {
  if (appointments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {appointments.map((a) => (
        <li
          key={a.id}
          className="flex items-center justify-between gap-2 text-sm"
        >
          <span className="flex min-w-0 items-center gap-2">
            {a.status === "completed" ? (
              <Check
                className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                aria-hidden
              />
            ) : (
              <Clock
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
            )}
            <span className="truncate">
              {formatManaguaDate(new Date(a.startsAt), "time")} · {a.clientName}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {a.employeeName}
            </span>
            <StatusBadge status={a.status} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TodayAppointmentsCard({
  appointments,
}: {
  appointments: AppointmentDTO[];
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="font-display text-lg">
          Citas de hoy ({appointments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AppointmentMiniList
          appointments={appointments}
          emptyLabel="No hay citas programadas para hoy"
        />
      </CardContent>
    </Card>
  );
}

export function NextAppointmentsCard({
  appointments,
}: {
  appointments: AppointmentDTO[];
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="font-display text-lg">
          Próximas 24 horas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AppointmentMiniList
          appointments={appointments}
          emptyLabel="Nada programado en las próximas 24 horas"
        />
      </CardContent>
    </Card>
  );
}

export function TopServicesCard({
  services,
}: {
  services: {
    serviceName: string;
    qty: number;
    revenue: number;
    currency: string;
  }[];
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="font-display text-lg">
          Servicios del mes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay servicios completados este mes
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {services.map((s) => (
              <li
                key={`${s.serviceName}-${s.currency}`}
                className="flex items-center justify-between"
              >
                <span className="truncate">
                  {s.serviceName}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ×{s.qty}
                  </span>
                </span>
                <span className="tabular-nums">
                  {formatMoney(s.revenue, s.currency as "NIO" | "USD")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
