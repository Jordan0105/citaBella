"use client";

import { useState } from "react";
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
import { MoneyInput } from "@/components/shared/money-input";
import {
  PaymentMethodSelector,
  type PaymentMethod,
} from "@/components/shared/payment-method-selector";
import { formatMoney } from "@/lib/money";
import { finalizeAppointment } from "../actions/manage-appointment";
import type { AppointmentDTO } from "../types";

interface FinalizeDialogProps {
  appointment: AppointmentDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/** Finaliza una cita → genera ingreso + comisiones (snapshot, transacción). */
export function FinalizeDialog({
  appointment,
  open,
  onOpenChange,
  onDone,
}: FinalizeDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tip, setTip] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await finalizeAppointment({
      id: appointment.id,
      method,
      tip: Number(tip) || 0,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    toast.success("Cita realizada", {
      description: `${formatMoney(result.data.amount, result.data.currency)} · ${
        result.data.tip > 0
          ? `propina ${formatMoney(result.data.tip, result.data.currency)} · `
          : ""
      }comisiones generadas`,
    });
    onOpenChange(false);
    onDone?.();
  }

  const total = appointment.price - appointment.discount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Finalizar servicio</DialogTitle>
          <DialogDescription>
            {appointment.clientName} ·{" "}
            {formatMoney(total, appointment.currency)}
            {appointment.discount > 0 && (
              <>
                {" "}
                (descuento{" "}
                {formatMoney(appointment.discount, appointment.currency)})
              </>
            )}
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
            <span className="text-sm font-medium">Método de pago</span>
            <PaymentMethodSelector value={method} onValueChange={setMethod} />
          </div>

          <div className="grid gap-2">
            <label htmlFor="finalize-tip" className="text-sm font-medium">
              Propina{" "}
              <span className="text-muted-foreground">
                (no genera comisión)
              </span>
            </label>
            <MoneyInput
              id="finalize-tip"
              currency={appointment.currency}
              value={tip}
              onValueChange={setTip}
            />
          </div>

          <p className="rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            Se generará el ingreso y las comisiones con los porcentajes actuales
            (snapshot inmutable). La cita pasará a “Cita realizada”.
          </p>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            Finalizar servicio
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
