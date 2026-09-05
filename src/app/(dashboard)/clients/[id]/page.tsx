import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatManaguaDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { formatNicPhone } from "@/lib/phone";
import { getAuthContext } from "@/features/auth/queries/get-auth-context";
import { getClientWithHistory } from "@/features/clients/queries/get-clients";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientDetailPage({
  params,
}: PageProps<"/clients/[id]">) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const { id } = await params;
  const result = await getClientWithHistory(id);
  if (!result) notFound();

  const { client, appointments } = result;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 rounded-full">
        <Link href="/clients">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Clientes
        </Link>
      </Button>

      <PageHeader title={client.fullName} description="Detalle e historial" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-soft lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="tabular-nums">{formatNicPhone(client.phone)}</p>
            {client.whatsapp && (
              <a
                href={`https://wa.me/${client.whatsapp.replace("+", "")}`}
                target="_blank"
                rel="noreferrer"
                className="block text-bella-600 tabular-nums hover:underline dark:text-bella-400"
              >
                WhatsApp: {formatNicPhone(client.whatsapp)}
              </a>
            )}
            {client.email && (
              <p className="text-muted-foreground">{client.email}</p>
            )}
            {client.birthDate && (
              <p className="text-muted-foreground">
                Cumpleaños:{" "}
                {formatManaguaDate(
                  new Date(`${client.birthDate}T12:00:00Z`),
                  "date",
                )}
              </p>
            )}
            {client.notes && (
              <p className="rounded-xl bg-muted px-3 py-2 text-xs whitespace-pre-line">
                {client.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Historial de citas ({appointments.length})
          </h2>
          {appointments.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Sin citas registradas
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {appointments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-soft"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={a.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatManaguaDate(new Date(a.startsAt), "datetime")}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {a.employeeName} ·{" "}
                      {a.services.map((s) => s.serviceName).join(" + ")}
                    </p>
                  </div>
                  <span className="shrink-0 font-display tabular-nums">
                    {formatMoney(a.price - a.discount, a.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
