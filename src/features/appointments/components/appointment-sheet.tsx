"use client";

import { useState } from "react";
import { Check, Clock, Loader2, MessageCircle, PencilLine } from "lucide-react";
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
import {
  StatusBadge,
  type AppointmentStatus,
} from "@/components/shared/status-badge";
import { formatManaguaDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  cancelAppointment,
  updateAppointmentStatus,
} from "../actions/manage-appointment";
import { sendWhatsAppReminder } from "@/features/notifications/actions/send-whatsapp";
import { FinalizeDialog } from "./finalize-dialog";
import type { AuthRole } from "@/features/auth/queries/get-auth-context";
import type { AppointmentDTO } from "../types";

interface AppointmentSheetProps {
  appointment: AppointmentDTO | null;
  role: AuthRole;
  myEmployeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentSheet({
  appointment,
  role,
  myEmployeeId,
  open,
  onOpenChange,
}: AppointmentSheetProps) {
  if (!appointment) return null;

  const isOwner = role === "owner";
  const isOwnWorker =
    role === "worker" && myEmployeeId === appointment.employeeId;
  const canManage = isOwner || isOwnWorker;
  const canFront = isOwner || role === "receptionist";
  const { status } = appointment;

  return (
    <SheetShell
      appointment={appointment}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="space-y-4">
        {status === "pending" && canFront && (
          <ActionButton
            label="Confirmar cita"
            pendingLabel="Confirmando..."
            action={() =>
              updateAppointmentStatus({
                id: appointment.id,
                status: "confirmed",
              })
            }
            onDone={onOpenChange}
          />
        )}
        {status === "confirmed" && canManage && (
          <ActionButton
            label="Iniciar servicio"
            pendingLabel="Iniciando..."
            action={() =>
              updateAppointmentStatus({
                id: appointment.id,
                status: "in_progress",
              })
            }
            onDone={onOpenChange}
          />
        )}
        {status === "in_progress" && canManage && (
          <FinalizeButton appointment={appointment} onDone={onOpenChange} />
        )}
        {(status === "pending" || status === "confirmed") &&
          (canFront || isOwnWorker) && (
            <CancelButton appointment={appointment} onDone={onOpenChange} />
          )}
        {status === "completed" && (
          <p className="rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            Cita realizada el{" "}
            {appointment.completedAt &&
              formatManaguaDate(new Date(appointment.completedAt), "datetime")}
          </p>
        )}
      </div>
    </SheetShell>
  );
}

function SheetShell({
  appointment,
  open,
  onOpenChange,
  children,
}: {
  appointment: AppointmentDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const total = appointment.price - appointment.discount;
  const whatsApp = appointment.clientPhone?.replace("+", "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <StatusBadge status={appointment.status as AppointmentStatus} />
          </div>
          <DialogTitle className="font-display">
            {appointment.clientName}
          </DialogTitle>
          <DialogDescription>
            {formatManaguaDate(new Date(appointment.startsAt), "datetime")} ·{" "}
            {formatMoney(total, appointment.currency)}
            {appointment.discount > 0 && (
              <span className="line-through opacity-70">
                {" "}
                {formatMoney(appointment.price, appointment.currency)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
            <AvatarEmployee
              fullName={appointment.employeeName}
              color={appointment.employeeColor}
            />
            {whatsApp && (
              <a
                href={`https://wa.me/${whatsApp}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`WhatsApp de ${appointment.clientName}`}
                className="rounded-full p-2 hover:bg-accent"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>

          {(appointment.status === "pending" ||
            appointment.status === "confirmed") &&
            whatsApp && <WhatsAppReminderButton appointment={appointment} />}

          <ul className="space-y-1">
            {appointment.services.map((line) => (
              <li key={line.id} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock
                    className="h-3.5 w-3.5 text-muted-foreground"
                    aria-hidden
                  />
                  {line.serviceName}
                  <span className="text-xs text-muted-foreground">
                    {line.durationMinutes} min
                  </span>
                </span>
                <span className="tabular-nums">
                  {formatMoney(line.price, appointment.currency)}
                </span>
              </li>
            ))}
          </ul>

          {appointment.notes && (
            <p className="rounded-xl bg-muted px-3 py-2 text-xs whitespace-pre-line">
              {appointment.notes}
            </p>
          )}

          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WhatsAppReminderButton({
  appointment,
}: {
  appointment: AppointmentDTO;
}) {
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    const result = await sendWhatsAppReminder({
      appointmentId: appointment.id,
    });
    setIsPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(
      result.data.mock
        ? "Recordatorio simulado (modo mock)"
        : "Recordatorio enviado por WhatsApp",
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      className="w-full rounded-full"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <MessageCircle className="h-4 w-4" aria-hidden />
      )}
      Recordar por WhatsApp
    </Button>
  );
}

function ActionButton({
  label,
  pendingLabel,
  action,
  onDone,
}: {
  label: string;
  pendingLabel: string;
  action: () => Promise<{ ok: boolean; error?: { message: string } }>;
  onDone: (open: boolean) => void;
}) {
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    const result = await action();
    setIsPending(false);
    if (!result.ok) {
      toast.error(result.error?.message ?? "No se pudo completar");
      return;
    }
    toast.success(label);
    onDone(false);
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className="w-full rounded-full"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Check className="h-4 w-4" aria-hidden />
      )}
      {isPending ? pendingLabel : label}
    </Button>
  );
}

function FinalizeButton({
  appointment,
  onDone,
}: {
  appointment: AppointmentDTO;
  onDone: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full rounded-full">
        <PencilLine className="h-4 w-4" aria-hidden />
        Finalizar servicio
      </Button>
      <FinalizeDialog
        appointment={appointment}
        open={open}
        onOpenChange={setOpen}
        onDone={() => onDone(false)}
      />
    </>
  );
}

function CancelButton({
  appointment,
  onDone,
}: {
  appointment: AppointmentDTO;
  onDone: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
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
    setOpen(false);
    onDone(false);
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full rounded-full"
      >
        Cancelar cita
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
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
    </>
  );
}
