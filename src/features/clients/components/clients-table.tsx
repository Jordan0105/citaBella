"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MessageCircle,
  PencilLine,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deactivateClient } from "../actions/deactivate-client";
import { ClientFormDialog } from "./client-form-dialog";
import { formatNicPhone } from "@/lib/phone";
import type { ClientDTO } from "../types";

interface ClientsTableProps {
  initialClients: ClientDTO[];
  isOwner: boolean;
}

export function ClientsTable({ initialClients, isOwner }: ClientsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ClientDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const clients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialClients;
    return initialClients.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q.replace(/\D/g, "")),
    );
  }, [initialClients, search]);

  async function handleDeactivate(client: ClientDTO) {
    setDeactivatingId(client.id);
    const result = await deactivateClient({ id: client.id });
    setDeactivatingId(null);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Cliente desactivado");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Buscar cliente"
            placeholder="Buscar por nombre o teléfono"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          className="rounded-full"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Nuevo cliente
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-soft">
          <p className="font-display text-lg">Sin clientes</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea tu primer cliente para empezar a agendar.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-soft md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Teléfono
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium hover:text-bella-600 dark:hover:text-bella-400"
                      >
                        {client.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatNicPhone(client.phone)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {client.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <a
                          href={`https://wa.me/${client.whatsapp?.replace("+", "") ?? client.phone.replace("+", "")}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`WhatsApp de ${client.fullName}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent"
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden />
                        </a>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Editar ${client.fullName}`}
                          onClick={() => {
                            setEditing(client);
                            setFormOpen(true);
                          }}
                        >
                          <PencilLine className="h-4 w-4" aria-hidden />
                        </Button>
                        {isOwner && (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Desactivar ${client.fullName}`}
                            disabled={deactivatingId === client.id}
                            onClick={() => handleDeactivate(client)}
                          >
                            {deactivatingId === client.id ? (
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <Trash2 className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <ul className="space-y-2 md:hidden">
            {clients.map((client) => (
              <li
                key={client.id}
                className="rounded-2xl border bg-card p-4 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-medium hover:text-bella-600 dark:hover:text-bella-400"
                  >
                    {client.fullName}
                  </Link>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Editar ${client.fullName}`}
                      onClick={() => {
                        setEditing(client);
                        setFormOpen(true);
                      }}
                    >
                      <PencilLine className="h-4 w-4" aria-hidden />
                    </Button>
                    {isOwner && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Desactivar ${client.fullName}`}
                        disabled={deactivatingId === client.id}
                        onClick={() => handleDeactivate(client)}
                      >
                        {deactivatingId === client.id ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                  {formatNicPhone(client.phone)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editing ?? undefined}
      />
    </div>
  );
}
