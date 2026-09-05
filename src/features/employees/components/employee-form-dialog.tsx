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
import { PhoneInput } from "@/components/shared/phone-input";
import { saveEmployee } from "../actions/save-employee";
import type { EmployeeDTO } from "../types";

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeDTO;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeFormDialogProps) {
  const isEdit = Boolean(employee);
  const [fullName, setFullName] = useState(employee?.fullName ?? "");
  const [specialty, setSpecialty] = useState(employee?.specialty ?? "");
  const [color, setColor] = useState(employee?.color ?? "#B7A6E3");
  const [commissionPct, setCommissionPct] = useState(
    employee?.commissionPct != null ? String(employee.commissionPct) : "",
  );
  const [phone, setPhone] = useState(
    employee?.phone?.replace("+505", "") ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await saveEmployee({
      id: employee?.id,
      fullName,
      specialty: specialty || "",
      color,
      commissionPct: commissionPct === "" ? null : Number(commissionPct),
      phone: phone ? `+505${phone}` : "",
      isActive: true,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    toast.success(isEdit ? "Trabajadora actualizada" : "Trabajadora creada");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Editar trabajadora" : "Nueva trabajadora"}
          </DialogTitle>
          <DialogDescription>
            Su color identifica sus citas en la agenda
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
            <Label htmlFor="emp-name">Nombre</Label>
            <Input
              id="emp-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ana López"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="emp-specialty">Especialidad</Label>
              <Input
                id="emp-specialty"
                value={specialty ?? ""}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Colorista"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-color">Color en agenda</Label>
              <Input
                id="emp-color"
                type="color"
                className="h-9 p-1"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="emp-commission">
              Comisión %{" "}
              <span className="text-muted-foreground">
                (vacío = 55% del salón; las citas ya finalizadas no cambian)
              </span>
            </Label>
            <Input
              id="emp-commission"
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

          <div className="grid gap-2">
            <Label htmlFor="emp-phone">Teléfono</Label>
            <PhoneInput id="emp-phone" value={phone} onValueChange={setPhone} />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {isEdit ? "Guardar cambios" : "Crear trabajadora"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
