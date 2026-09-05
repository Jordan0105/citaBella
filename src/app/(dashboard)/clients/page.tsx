import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { getAuthContext } from "@/features/auth/queries/get-auth-context";
import { ClientsTable } from "@/features/clients/components/clients-table";
import { getClients } from "@/features/clients/queries/get-clients";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const clients = await getClients();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Administra tu clientela e historial de citas"
      />
      <ClientsTable initialClients={clients} isOwner={auth.role === "owner"} />
    </div>
  );
}
