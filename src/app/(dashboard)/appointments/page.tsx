import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { getAuthContext } from "@/features/auth/queries/get-auth-context";
import { AppointmentsList } from "@/features/appointments/components/appointments-list";
import { getUpcomingAppointments } from "@/features/appointments/queries/get-appointments";

export const metadata: Metadata = { title: "Citas" };

export default async function AppointmentsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const appointments = await getUpcomingAppointments(7);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citas"
        description="Próximos 7 días · confirma, inicia y finaliza"
      />
      <AppointmentsList
        initialAppointments={appointments}
        role={auth.role}
        myEmployeeId={auth.employeeId}
      />
    </div>
  );
}
