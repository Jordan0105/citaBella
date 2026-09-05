"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AvatarEmployee } from "@/components/shared/avatar-employee";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatManaguaDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { AuthRole } from "@/features/auth/queries/get-auth-context";
import {
  cancelAppointment,
  updateAppointmentStatus,
} from "../actions/manage-appointment";
import { FinalizeDialog } from "./finalize-dialog";
import { appointmentsKeys } from "../queries/appointments-query";
import type { AppointmentDTO } from "../types";

interface AppointmentsListProps {
  initialAppointments: AppointmentDTO[];
  role: AuthRole;
  myEmployeeId: string | null;
}

export function AppointmentsList({
  initialAppointments,
  role,
  myEmployeeId,
}: AppointmentsListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [finalizeTarget, setFinalizeTarget] = useState<AppointmentDTO | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] = useState<AppointmentDTO | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const canFront = role === "owner" || role === "receptionist";

  function canManage(a: AppointmentDTO): boolean {
    return (
      role === "owner" || (role === "worker" && myEmployeeId === a.employeeId)
    );
  }

  async function runAction(
    id: string,
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
    successMessage: string,
  ) {
    setPendingId(id);
    const result = await action();
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error?.message ?? "No se pudo completar");
      return;
    }
    toast.success(successMessage);
    queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
    router.refresh();
  }

  const groups = groupByDay(initialAppointments);

  if (initialAppointments.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center shadow-soft">
        <p className="font-display text-lg">Sin citas próximas</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Las nuevas citas aparecen aquí y en la agenda.
        </p>
        <Button asChild className="mt-4 rounded-full">
          <Link href="/calendar">Ir a la agenda</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {[...groups.entries()].map(([day, items]) => (
          <section key={day} aria-label={day} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {formatManaguaDate(new Date(items[0].startsAt), "date")}
            </h2>
            <ul className="space-y-2">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg tabular-nums">
                        {formatManaguaDate(new Date(a.startsAt), "time")}
                      </span>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-sm font-medium">{a.clientName}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <AvatarEmployee
                        fullName={a.employeeName}
                        color={a.employeeColor}
                      />
                      <span>
                        {a.services.map((s) => s.serviceName).join(" + ")}
                      </span>
                      <span className="tabular-nums">
                        {formatMoney(a.price - a.discount, a.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {a.status === "pending" && canFront && (
                      <Button
                        size="sm"
                        className="rounded-full"
                        disabled={pendingId === a.id}
                        onClick={() =>
                          runAction(
                            a.id,
                            () =>
                              updateAppointmentStatus({
                                id: a.id,
                                status: "confirmed",
                              }),
                            "Cita confirmada",
                          )
                        }
                      >
                        {pendingId === a.id && (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden
                          />
                        )}
                        Confirmar
                      </Button>
                    )}
                    {a.status === "confirmed" && canManage(a) && (
                      <Button
                        size="sm"
                        className="rounded-full"
                        disabled={pendingId === a.id}
                        onClick={() =>
                          runAction(
                            a.id,
                            () =>
                              updateAppointmentStatus({
                                id: a.id,
                                status: "in_progress",
                              }),
                            "Servicio iniciado",
                          )
                        }
                      >
                        Iniciar
                      </Button>
                    )}
                    {a.status === "in_progress" && canManage(a) && (
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => setFinalizeTarget(a)}
                      >
                        Finalizar
                      </Button>
                    )}
                    {(a.status === "pending" || a.status === "confirmed") &&
                      (canFront || canManage(a)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => setCancelTarget(a)}
                        >
                          Cancelar
                        </Button>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {finalizeTarget && (
        <FinalizeDialog
          appointment={finalizeTarget}
          open
          onOpenChange={(open) => !open && setFinalizeTarget(null)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
            router.refresh();
          }}
        />
      )}

      {cancelTarget && (
        <CancelDialog
          appointment={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function groupByDay(items: AppointmentDTO[]): Map<string, AppointmentDTO[]> {
  const map = new Map<string, AppointmentDTO[]>();
  for (const item of items) {
    const key = item.startsAt.slice(0, 10);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

function CancelDialog({
  appointment,
  onClose,
  onDone,
}: {
  appointment: AppointmentDTO;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    const result = await cancelAppointment({ id: appointment.id, reason });
    setIsPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    toast.success("Cita cancelada");
    onDone();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Cancelar cita</DialogTitle>
          <DialogDescription>
            {appointment.clientName} — cuéntanos el motivo
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Textarea
            aria-label="Motivo de la cancelación"
            placeholder="Motivo de la cancelación"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            type="submit"
            variant="destructive"
            disabled={isPending || reason.trim().length < 3}
            className="w-full rounded-full"
          >
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            Confirmar cancelación
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
