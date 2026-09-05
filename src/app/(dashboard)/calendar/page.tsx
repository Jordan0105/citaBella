import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentWeekRangeISO } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { getAuthContext } from "@/features/auth/queries/get-auth-context";
import { CalendarView } from "@/features/appointments/components/calendar-view";
import {
  getAppointmentsInRange,
  getAppointmentsMeta,
} from "@/features/appointments/queries/get-appointments";

export const metadata: Metadata = { title: "Agenda" };

export default async function CalendarPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const range = currentWeekRangeISO();
  const [appointments, meta] = await Promise.all([
    getAppointmentsInRange(range.from, range.to),
    getAppointmentsMeta(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Día, semana y mes · arrastra para reprogramar"
      />
      <CalendarView
        role={auth.role}
        myEmployeeId={auth.employeeId}
        initialAppointments={appointments}
        meta={meta}
      />
    </div>
  );
}
