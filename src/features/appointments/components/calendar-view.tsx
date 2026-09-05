"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentWeekRangeISO, nextWorkdayManagua } from "@/lib/dates";
import type { AuthRole } from "@/features/auth/queries/get-auth-context";
import { rescheduleAppointment } from "../actions/manage-appointment";
import { appointmentsRangeOptions } from "../queries/appointments-query";
import { AppointmentFormDialog } from "./appointment-form-dialog";
import { AppointmentSheet } from "./appointment-sheet";
import type { AppointmentDTO, AppointmentsMeta } from "../types";

const CalendarInner = dynamic(() => import("./calendar-inner"), {
  ssr: false,
  loading: () => <CalendarSkeleton />,
});

interface CalendarViewProps {
  role: AuthRole;
  myEmployeeId: string | null;
  initialAppointments: AppointmentDTO[];
  meta: AppointmentsMeta;
}

export function CalendarView({
  role,
  myEmployeeId,
  initialAppointments,
  meta,
}: CalendarViewProps) {
  const queryClient = useQueryClient();
  const [initialRange] = useState(currentWeekRangeISO);
  const [range, setRange] = useState(initialRange);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [selected, setSelected] = useState<AppointmentDTO | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formPrefill, setFormPrefill] = useState<{
    date: string;
    time: string;
    startISO?: string;
    endISO?: string;
  }>(() => {
    const wd = nextWorkdayManagua(9);
    return { date: wd.date, time: wd.time };
  });

  const isInitialRange =
    range.from === initialRange.from && range.to === initialRange.to;

  const { data, isPending } = useQuery({
    ...appointmentsRangeOptions(range.from, range.to),
    initialData: isInitialRange ? initialAppointments : undefined,
  });

  const appointments = useMemo(() => {
    const list = data ?? [];
    return employeeFilter === "all"
      ? list
      : list.filter((a) => a.employeeId === employeeFilter);
  }, [data, employeeFilter]);

  function handleDateSelect(startISO: string, endISO: string) {
    setFormPrefill({ date: "", time: "", startISO, endISO });
    setFormOpen(true);
  }

  function handleEventDrop(
    appointment: AppointmentDTO,
    startISO: string,
    endISO: string,
  ) {
    // Optimistic UI: mover en caché, revertir si el servidor rechaza
    const key = [
      "appointments",
      "range",
      { from: range.from, to: range.to },
    ] as const;
    const previous = queryClient.getQueryData<AppointmentDTO[]>(key);
    queryClient.setQueryData<AppointmentDTO[]>(key, (old) =>
      (old ?? []).map((a) =>
        a.id === appointment.id
          ? { ...a, startsAt: startISO, endsAt: endISO }
          : a,
      ),
    );

    toast.promise(
      rescheduleAppointment({
        id: appointment.id,
        startsAt: startISO,
        endsAt: endISO,
      }),
      {
        loading: "Reprogramando...",
        success: () => {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          return "Cita reprogramada";
        },
        error: (err) => {
          queryClient.setQueryData(key, previous);
          return err.message;
        },
      },
    );
  }

  const defaultForm = nextWorkdayManagua(9);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-56">
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger
              aria-label="Filtrar por trabajadora"
              className="w-full"
            >
              <SelectValue placeholder="Trabajadora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las trabajadoras</SelectItem>
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

        {(role === "owner" || role === "receptionist") && (
          <Button
            onClick={() => {
              setFormPrefill({
                date: defaultForm.date,
                time: defaultForm.time,
              });
              setFormOpen(true);
            }}
            className="rounded-full"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nueva cita
          </Button>
        )}
      </div>

      {isPending && !data ? (
        <CalendarSkeleton />
      ) : (
        <div className="rounded-2xl border bg-card p-3 shadow-soft sm:p-4">
          <CalendarInner
            appointments={appointments}
            onDateSelect={handleDateSelect}
            onEventClick={(a) => {
              setSelected(a);
              setSheetOpen(true);
            }}
            onEventDrop={handleEventDrop}
            onRangeChange={(from, to) => setRange({ from, to })}
          />
        </div>
      )}

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        meta={meta}
        defaultDate={formPrefill.date || defaultForm.date}
        defaultTime={formPrefill.time || defaultForm.time}
        defaultStartISO={formPrefill.startISO}
        defaultEndISO={formPrefill.endISO}
      />

      <AppointmentSheet
        appointment={selected}
        role={role}
        myEmployeeId={myEmployeeId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-7 gap-2">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}
