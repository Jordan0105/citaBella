import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { getAuthContext } from "@/features/auth/queries/get-auth-context";
import { ReportView } from "@/features/reports/components/report-view";
import { MyReportView } from "@/features/reports/components/my-report-view";
import {
  getMyReport,
  getReport,
  PERIOD_LABELS,
  type ReportPeriod,
} from "@/features/reports/queries/get-report";

export const metadata: Metadata = { title: "Reportes" };

const VALID_PERIODS = Object.keys(PERIOD_LABELS) as ReportPeriod[];

export default async function ReportsPage({
  searchParams,
}: PageProps<"/reports">) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  // Receptionista jamás ve reportes financieros (docs/permissions.md)
  if (auth.role === "receptionist") redirect("/dashboard");

  const params = await searchParams;
  const period = VALID_PERIODS.includes(params.period as ReportPeriod)
    ? (params.period as ReportPeriod)
    : "monthly";

  if (auth.role === "worker") {
    const my = await getMyReport(period);
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mis reportes"
          description="Tus citas y comisiones por período"
        />
        <MyReportView report={my} />
      </div>
    );
  }

  const report = await getReport(period);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Diario, semanal, mensual y anual con desgloses y exportación"
      />
      <ReportView
        report={report}
        period={period}
        refDateISO={new Date().toISOString()}
      />
    </div>
  );
}
