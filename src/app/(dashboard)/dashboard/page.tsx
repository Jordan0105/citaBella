import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CalendarDays, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  MetricCard,
  MetricCardSkeleton,
} from "@/components/shared/metric-card";
import { getAuthContext } from "@/features/auth/queries/get-auth-context";
import { formatMoney } from "@/lib/money";
import {
  getNextAppointments,
  getMyCommissionsMonth,
  getMonthRevenue,
  getTodayAppointments,
  getTodayRevenue,
  getTopServicesMonth,
} from "@/features/reports/queries/get-dashboard";
import {
  NextAppointmentsCard,
  TodayAppointmentsCard,
  TopServicesCard,
} from "@/features/reports/components/dashboard-widgets";

export const metadata: Metadata = { title: "Inicio" };

function revenueHint(
  rows: { currency: "NIO" | "USD"; income: number }[],
): string {
  const usd = rows.find((r) => r.currency === "USD");
  return usd && usd.income > 0 ? `+ ${formatMoney(usd.income, "USD")}` : "";
}

export default async function DashboardPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const isOwner = auth.role === "owner";
  const isWorker = auth.role === "worker";
  const firstName = auth.fullName.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${firstName}`}
        description="Resumen de tu salón hoy"
      />

      {/* KPIs de agenda: todos los roles */}
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        }
      >
        <TodayAppointmentsSection />
      </Suspense>

      <Suspense fallback={<MetricCardSkeleton />}>
        <NextAppointmentsSection />
      </Suspense>

      {/* KPIs financieros: solo owner */}
      {isOwner && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Suspense fallback={<MetricCardSkeleton />}>
              <TodayRevenueSection />
            </Suspense>
            <Suspense fallback={<MetricCardSkeleton />}>
              <MonthRevenueSection />
            </Suspense>
          </div>
          <Suspense
            fallback={
              <div className="h-40 animate-pulse rounded-2xl bg-muted" />
            }
          >
            <TopServicesSection />
          </Suspense>
        </>
      )}

      {/* Comisiones propias: worker */}
      {isWorker && (
        <Suspense fallback={<MetricCardSkeleton />}>
          <MyCommissionsSection />
        </Suspense>
      )}
    </div>
  );
}

async function TodayAppointmentsSection() {
  const appointments = await getTodayAppointments();
  const done = appointments.filter((a) => a.status === "completed").length;
  return (
    <>
      <MetricCard
        label="Citas de hoy"
        value={String(appointments.length)}
        hint={`${done} realizadas · ${appointments.length - done} pendientes`}
        icon={CalendarDays}
      />
      <TodayAppointmentsCard appointments={appointments} />
    </>
  );
}

async function NextAppointmentsSection() {
  const appointments = await getNextAppointments(5);
  return <NextAppointmentsCard appointments={appointments} />;
}

async function TodayRevenueSection() {
  const rows = await getTodayRevenue();
  const nio = rows.find((r) => r.currency === "NIO");
  const total = nio?.income ?? 0;
  return (
    <MetricCard
      label="Vendido hoy"
      value={formatMoney(total, "NIO")}
      hint={revenueHint(rows)}
      icon={Wallet}
    />
  );
}

async function MonthRevenueSection() {
  const rows = await getMonthRevenue();
  const nio = rows.find((r) => r.currency === "NIO");
  const income = nio?.income ?? 0;
  const expenses = nio?.expenses ?? 0;
  return (
    <MetricCard
      label="Vendido del mes"
      value={formatMoney(income, "NIO")}
      hint={`Gastos ${formatMoney(expenses, "NIO")} · neto ${formatMoney(income - expenses, "NIO")}`}
      icon={TrendingUp}
    />
  );
}

async function TopServicesSection() {
  const services = await getTopServicesMonth(5);
  return <TopServicesCard services={services} />;
}

async function MyCommissionsSection() {
  const my = await getMyCommissionsMonth();
  return (
    <MetricCard
      label="Mis comisiones del mes"
      value={formatMoney(my.total, my.currency as "NIO" | "USD")}
      hint={`${my.appointmentsQty} citas realizadas`}
      icon={TrendingUp}
    />
  );
}
