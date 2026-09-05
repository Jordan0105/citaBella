"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvatarEmployee } from "@/components/shared/avatar-employee";
import { deactivateEmployee } from "../actions/save-employee";
import { AvailabilityDialog } from "./availability-dialog";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { formatPercent } from "@/lib/money";
import type { AvailabilitySlotDTO, EmployeeDTO } from "../types";

interface EmployeesTableProps {
  initialEmployees: EmployeeDTO[];
  availability: Record<string, AvailabilitySlotDTO[]>;
}

export function EmployeesTable({
  initialEmployees,
  availability,
}: EmployeesTableProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<EmployeeDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<EmployeeDTO | null>(
    null,
  );
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  async function handleDeactivate(employee: EmployeeDTO) {
    setDeactivatingId(employee.id);
    const result = await deactivateEmployee({ id: employee.id });
    setDeactivatingId(null);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Trabajadora desactivada");
    router.refresh();
  }

  function availabilityLabel(slots: AvailabilitySlotDTO[]): string {
    if (slots.length === 0) return "Horario del salón";
    const days = slots
      .filter((s) => s.weekday !== 0)
      .sort((a, b) => a.weekday - b.weekday);
    return days.map((s) => `${s.startTime}–${s.endTime}`).join(" · ");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="rounded-full"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Nueva trabajadora
        </Button>
      </div>

      <ul className="space-y-2">
        {initialEmployees.map((employee) => (
          <li
            key={employee.id}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <AvatarEmployee
                fullName={employee.fullName}
                color={employee.color}
              />
              <p className="text-xs text-muted-foreground">
                {employee.specialty ?? "Estilista"} ·{" "}
                {employee.commissionPct != null
                  ? `${formatPercent(employee.commissionPct)} fija`
                  : "% del salón"}
                {employee.phone && ` · ${employee.phone}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {availabilityLabel(availability[employee.id] ?? [])}
              </p>
            </div>
            <div className="flex gap-1 sm:justify-end">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setScheduleTarget(employee)}
              >
                <CalendarClock className="h-4 w-4" aria-hidden />
                Horario
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Editar ${employee.fullName}`}
                onClick={() => {
                  setEditing(employee);
                  setFormOpen(true);
                }}
              >
                <PencilLine className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Desactivar ${employee.fullName}`}
                disabled={deactivatingId === employee.id}
                onClick={() => handleDeactivate(employee)}
              >
                {deactivatingId === employee.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden />
                )}
              </Button>
            </div>
          </li>
        ))}
        {initialEmployees.length === 0 && (
          <li className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
            Sin trabajadoras registradas
          </li>
        )}
      </ul>

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editing ?? undefined}
      />
      <AvailabilityDialog
        employee={scheduleTarget}
        slots={scheduleTarget ? (availability[scheduleTarget.id] ?? []) : []}
        open={scheduleTarget != null}
        onOpenChange={(open) => !open && setScheduleTarget(null)}
      />
    </div>
  );
}
