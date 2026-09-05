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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/shared/money-input";
import { parseMoneyInput } from "@/lib/money";
import { saveService } from "../actions/save-service";
import type { ServiceDTO } from "../types";

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceDTO;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
}: ServiceFormDialogProps) {
  const isEdit = Boolean(service);
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [priceNio, setPriceNio] = useState(
    service ? String(service.priceNio) : "",
  );
  const [priceUsd, setPriceUsd] = useState(
    service ? String(service.priceUsd) : "",
  );
  const [duration, setDuration] = useState(
    service ? String(service.durationMinutes) : "30",
  );
  const [commissionPct, setCommissionPct] = useState(
    service?.commissionPct != null ? String(service.commissionPct) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await saveService({
      id: service?.id,
      name,
      description: description || "",
      priceNio: parseMoneyInput(priceNio),
      priceUsd: parseMoneyInput(priceUsd),
      durationMinutes: Number(duration) || 0,
      commissionPct: commissionPct === "" ? null : Number(commissionPct),
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    toast.success(isEdit ? "Servicio actualizado" : "Servicio creado");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Editar servicio" : "Nuevo servicio"}
          </DialogTitle>
          <DialogDescription>
            Precio en ambas monedas y comisión opcional para este servicio
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
            <Label htmlFor="svc-name">Nombre</Label>
            <Input
              id="svc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Corte mujer"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="svc-price-nio">Precio C$</Label>
              <MoneyInput
                id="svc-price-nio"
                currency="NIO"
                value={priceNio}
                onValueChange={setPriceNio}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="svc-price-usd">Precio $</Label>
              <MoneyInput
                id="svc-price-usd"
                currency="USD"
                value={priceUsd}
                onValueChange={setPriceUsd}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="svc-duration">Duración (min)</Label>
              <Input
                id="svc-duration"
                type="number"
                inputMode="numeric"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="svc-commission">
                Comisión %{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="svc-commission"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.5"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                placeholder="55"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="svc-description">Descripción</Label>
            <Textarea
              id="svc-description"
              rows={2}
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Incluye lavado y styling…"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {isEdit ? "Guardar cambios" : "Crear servicio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
