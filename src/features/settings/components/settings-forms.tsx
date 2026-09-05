"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSetting } from "../actions/update-setting";
import type { SalonSettings } from "../schemas/setting";

const DAYS = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
];

interface SettingsFormsProps {
  settings: SalonSettings;
}

export function SettingsForms({ settings }: SettingsFormsProps) {
  const router = useRouter();

  const [ownerPct, setOwnerPct] = useState(
    String(settings.defaultCommissionOwner),
  );
  const [workerPct, setWorkerPct] = useState(
    String(settings.defaultCommissionWorker),
  );
  const [rate, setRate] = useState(String(settings.exchangeRate));
  const [open, setOpen] = useState(settings.businessHours?.open ?? "08:00");
  const [close, setClose] = useState(settings.businessHours?.close ?? "19:00");
  const [days, setDays] = useState<number[]>(
    settings.businessHours?.days ?? [1, 2, 3, 4, 5, 6],
  );
  const [salonName, setSalonName] = useState(settings.salonInfo?.name ?? "");
  const [salonPhone, setSalonPhone] = useState(settings.salonInfo?.phone ?? "");
  const [salonAddress, setSalonAddress] = useState(
    settings.salonInfo?.address ?? "",
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function save(key: string, value: unknown) {
    setPendingKey(key);
    const result = await updateSetting(key, value);
    setPendingKey(null);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Configuración guardada");
    router.refresh();
  }

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Comisiones por defecto
          </CardTitle>
          <CardDescription>
            Se usan cuando la trabajadora y el servicio no definen una propia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="set-owner">Dueña %</Label>
              <Input
                id="set-owner"
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={ownerPct}
                onChange={(e) => setOwnerPct(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="set-worker">Trabajadora %</Label>
              <Input
                id="set-worker"
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={workerPct}
                onChange={(e) => setWorkerPct(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="rounded-full"
            disabled={pendingKey === "commissions"}
            onClick={() =>
              save("default_commission_owner", { pct: Number(ownerPct) }).then(
                () =>
                  save("default_commission_worker", { pct: Number(workerPct) }),
              )
            }
          >
            {pendingKey === "commissions" && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            Guardar comisiones
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-lg">Tasa de cambio</CardTitle>
          <CardDescription>
            NIO por 1 USD · las operaciones guardan la tasa del día como
            snapshot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="set-rate">C$ por $1</Label>
            <Input
              id="set-rate"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <Button
            className="rounded-full"
            disabled={pendingKey === "exchange_rate"}
            onClick={() => save("exchange_rate", { nio_per_usd: Number(rate) })}
          >
            {pendingKey === "exchange_rate" && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            Guardar tasa
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Horario del salón
          </CardTitle>
          <CardDescription>
            Se usa cuando una trabajadora no tiene horario propio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="set-open">Apertura</Label>
              <Input
                id="set-open"
                type="time"
                value={open}
                onChange={(e) => setOpen(e.target.value)}
                className="tabular-nums"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="set-close">Cierre</Label>
              <Input
                id="set-close"
                type="time"
                value={close}
                onChange={(e) => setClose(e.target.value)}
                className="tabular-nums"
              />
            </div>
          </div>
          <div role="group" aria-label="Días laborables" className="flex gap-2">
            {DAYS.map((day) => {
              const active = days.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleDay(day.value)}
                  className={`h-10 w-10 rounded-full border text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-bella-700 dark:text-bella-300"
                      : "border-input text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <Button
            className="rounded-full"
            disabled={pendingKey === "business_hours"}
            onClick={() =>
              save("business_hours", { open, close, days: [...days].sort() })
            }
          >
            {pendingKey === "business_hours" && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            Guardar horario
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Datos del salón
          </CardTitle>
          <CardDescription>Información general del negocio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="set-salon-name">Nombre</Label>
            <Input
              id="set-salon-name"
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              placeholder="CitaBella Studio"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="set-salon-phone">Teléfono</Label>
              <Input
                id="set-salon-phone"
                value={salonPhone ?? ""}
                onChange={(e) => setSalonPhone(e.target.value)}
                placeholder="+505 8888 7777"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="set-salon-address">Dirección</Label>
              <Input
                id="set-salon-address"
                value={salonAddress ?? ""}
                onChange={(e) => setSalonAddress(e.target.value)}
                placeholder="León, Nicaragua"
              />
            </div>
          </div>
          <Button
            className="rounded-full"
            disabled={pendingKey === "salon_info"}
            onClick={() =>
              save("salon_info", {
                name: salonName,
                phone: salonPhone,
                address: salonAddress,
              })
            }
          >
            {pendingKey === "salon_info" && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            Guardar datos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
