import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import {
  getAuthContext,
  requireOwner,
} from "@/features/auth/queries/get-auth-context";
import { EmployeesTable } from "@/features/employees/components/employees-table";
import {
  getAvailability,
  getEmployees,
} from "@/features/employees/queries/get-employees";

export const metadata: Metadata = { title: "Trabajadoras" };

export default async function EmployeesPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  await requireOwner();

  const employees = await getEmployees();
  const entries = await Promise.all(
    employees.map(async (e) => [e.id, await getAvailability(e.id)] as const),
  );
  const availability = Object.fromEntries(entries);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trabajadoras"
        description="Equipo, especialidades, comisiones y horarios"
      />
      <EmployeesTable
        initialEmployees={employees}
        availability={availability}
      />
    </div>
  );
}
