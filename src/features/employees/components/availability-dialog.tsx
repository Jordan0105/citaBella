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
import { setAvailability } from "../actions/save-employee";
import type { AvailabilitySlotDTO, EmployeeDTO } from "../types";

const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

interface AvailabilityDialogProps {
  employee: EmployeeDTO | null;
  slots: AvailabilitySlotDTO[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Editor del horario semanal (lunes a domingo) de una trabajadora. */
export function AvailabilityDialog({
  employee,
  slots,
  open,
  onOpenChange,
}: AvailabilityDialogProps) {
  const [rows, setRows] = useState<Record<number, [string, string]>>(() => {
    const initial: Record<number, [string, string]> = {};
    for (const slot of slots) {
      initial[slot.weekday] = [slot.startTime, slot.endTime];
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(weekday: number) {
    setRows((prev) => {
      const next = { ...prev };
      if (next[weekday]) delete next[weekday];
      else next[weekday] = ["08:00", "17:00"];
      return next;
    });
  }

  function updateTime(weekday: number, index: 0 | 1, value: string) {
    setRows((prev) => {
      const current = prev[weekday] ?? ["08:00", "17:00"];
      const next = [...current] as [string, string];
      next[index] = value;
      return { ...prev, [weekday]: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) return;
    setError(null);
    setIsSubmitting(true);

    const result = await setAvailability({
      employeeId: employee.id,
      slots: Object.entries(rows).map(([weekday, [startTime, endTime]]) => ({
        weekday: Number(weekday),
        startTime,
        endTime,
      })),
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    toast.success("Horario guardado");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            Horario de {employee?.fullName}
          </DialogTitle>
          <DialogDescription>
            Sin horario propio se usa el horario del salón
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {WEEKDAYS.map((day) => {
            const active = rows[day.value] != null;
            const range = rows[day.value] ?? ["08:00", "17:00"];
            return (
              <div key={day.value} className="flex items-center gap-2">
                <label className="flex w-28 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(day.value)}
                    aria-label={`Trabaja el ${day.label}`}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  {day.label}
                </label>
                <Input
                  type="time"
                  aria-label={`Inicio ${day.label}`}
                  value={range[0]}
                  onChange={(e) => updateTime(day.value, 0, e.target.value)}
                  disabled={!active}
                  className="tabular-nums"
                />
                <Input
                  type="time"
                  aria-label={`Fin ${day.label}`}
                  value={range[1]}
                  onChange={(e) => updateTime(day.value, 1, e.target.value)}
                  disabled={!active}
                  className="tabular-nums"
                />
              </div>
            );
          })}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            Guardar horario
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
