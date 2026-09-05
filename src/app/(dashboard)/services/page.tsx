import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import {
  getAuthContext,
  requireOwner,
} from "@/features/auth/queries/get-auth-context";
import { ServicesTable } from "@/features/services/components/services-table";
import { getServices } from "@/features/services/queries/get-services";

export const metadata: Metadata = { title: "Servicios" };

export default async function ServicesPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  await requireOwner();

  const services = await getServices();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicios"
        description="Catálogo con precios en córdobas y dólares"
      />
      <ServicesTable initialServices={services} />
    </div>
  );
}
