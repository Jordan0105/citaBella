"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/shared/money-input";
import { formatMoney, parseMoneyInput } from "@/lib/money";
import { managuaWallToUtcISO } from "@/lib/dates";
import { createAppointment } from "../actions/create-appointment";
import type { AppointmentsMeta } from "../types";
import type { CurrencyCode } from "../types";

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: AppointmentsMeta;
  /** "YYYY-MM-DD" y "HH:mm" de pared en Managua. */
  defaultDate: string;
  defaultTime: string;
  /** ISO con offset de FullCalendar al hacer click/selección en el calendario. */
  defaultStartISO?: string;
  defaultEndISO?: string;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  meta,
  defaultDate,
  defaultTime,
  defaultStartISO,
  defaultEndISO,
}: AppointmentFormDialogProps) {
  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [servicePick, setServicePick] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [currency, setCurrency] = useState<CurrencyCode>("NIO");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedServices = useMemo(
    () => meta.services.filter((s) => serviceIds.includes(s.id)),
    [meta.services, serviceIds],
  );
  const total = selectedServices.reduce(
    (sum, s) => sum + (currency === "NIO" ? s.priceNio : s.priceUsd),
    0,
  );
  const totalMinutes = selectedServices.reduce(
    (sum, s) => sum + s.durationMinutes,
    0,
  );

  function reset() {
    setClientId("");
    setEmployeeId("");
    setServiceIds([]);
    setServicePick("");
    setDiscount("0");
    setNotes("");
    setError(null);
  }

  function addService(id: string) {
    if (id && !serviceIds.includes(id)) setServiceIds((prev) => [...prev, id]);
    setServicePick("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await createAppointment({
      clientId,
      employeeId,
      serviceIds,
      startsAt: defaultStartISO ?? managuaWallToUtcISO(date, time),
      endsAt: defaultEndISO,
      currency,
      discount: parseMoneyInput(discount),
      notes: notes || undefined,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    toast.success("Cita creada", {
      description: `${result.data.clientName} · ${formatMoney(result.data.price - result.data.discount, result.data.currency)}`,
    });
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Nueva cita</DialogTitle>
          <DialogDescription>
            El conflicto de horario y la disponibilidad se validan en el
            servidor
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div className="grid gap-2">
            <label htmlFor="appt-client" className="text-sm font-medium">
              Cliente
            </label>
            <Select value={clientId} onValueChange={setClientId} required>
              <SelectTrigger
                id="appt-client"
                aria-label="Cliente"
                className="w-full"
              >
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {meta.clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="appt-employee" className="text-sm font-medium">
              Trabajadora
            </label>
            <Select value={employeeId} onValueChange={setEmployeeId} required>
              <SelectTrigger
                id="appt-employee"
                aria-label="Trabajadora"
                className="w-full"
              >
                <SelectValue placeholder="Selecciona una trabajadora" />
              </SelectTrigger>
              <SelectContent>
                {meta.employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: e.color }}
                      />
                      {e.fullName}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="appt-service" className="text-sm font-medium">
              Servicios
            </label>
            <Select value={servicePick} onValueChange={addService}>
              <SelectTrigger
                id="appt-service"
                aria-label="Servicio"
                className="w-full"
              >
                <SelectValue placeholder="Agregar servicio" />
              </SelectTrigger>
              <SelectContent>
                {meta.services
                  .filter((s) => !serviceIds.includes(s.id))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {selectedServices.length > 0 && (
              <ul className="space-y-1.5">
                {selectedServices.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm"
                  >
                    <span>
                      {s.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {s.durationMinutes} min
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Quitar ${s.name}`}
                      onClick={() =>
                        setServiceIds((prev) =>
                          prev.filter((id) => id !== s.id),
                        )
                      }
                      className="rounded-full p-1 hover:bg-accent"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label htmlFor="appt-date" className="text-sm font-medium">
                Fecha
              </label>
              <Input
                id="appt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="appt-time" className="text-sm font-medium">
                Hora inicio
              </label>
              <Input
                id="appt-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Moneda</span>
            <div
              role="radiogroup"
              aria-label="Moneda"
              className="grid grid-cols-2 gap-2"
            >
              {(["NIO", "USD"] as CurrencyCode[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={currency === c}
                  onClick={() => setCurrency(c)}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-medium transition-colors ${
                    currency === c
                      ? "border-primary bg-primary/10 text-bella-700 dark:text-bella-300"
                      : "border-input text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {c === "NIO" ? "C$ Córdobas" : "$ Dólares"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label htmlFor="appt-discount" className="text-sm font-medium">
                Descuento
              </label>
              <MoneyInput
                id="appt-discount"
                currency={currency}
                value={discount}
                onValueChange={setDiscount}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Total</span>
              <p className="flex h-9 items-center font-display text-lg tabular-nums">
                {formatMoney(total, currency)}
                {totalMinutes > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {totalMinutes} min
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="appt-notes" className="text-sm font-medium">
              Notas
            </label>
            <Textarea
              id="appt-notes"
              rows={2}
              placeholder="Preferencias, color, alergias…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={
              isSubmitting || isPendingFields(clientId, employeeId, serviceIds)
            }
            className="w-full rounded-full"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="h-4 w-4" aria-hidden />
            )}
            Crear cita
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function isPendingFields(
  clientId: string,
  employeeId: string,
  serviceIds: string[],
): boolean {
  return !clientId || !employeeId || serviceIds.length === 0;
}
