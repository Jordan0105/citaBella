import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/features/auth/queries/get-auth-context";
import { FinanceDashboard } from "@/features/payments/components/finance-dashboard";
import { getCashData } from "@/features/payments/queries/get-cash";

export const metadata: Metadata = { title: "Caja" };

export default async function FinancePage() {
  await requireOwner();
  const data = await getCashData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caja"
        description="Cierre de hoy, ingresos, gastos y propinas"
      />
      <FinanceDashboard data={data} />
    </div>
  );
}
