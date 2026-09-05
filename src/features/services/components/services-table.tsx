"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PencilLine, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPercent } from "@/lib/money";
import { deactivateService } from "../actions/save-service";
import { ServiceFormDialog } from "./service-form-dialog";
import type { ServiceDTO } from "../types";

interface ServicesTableProps {
  initialServices: ServiceDTO[];
}

export function ServicesTable({ initialServices }: ServicesTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ServiceDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const services = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialServices;
    return initialServices.filter((s) => s.name.toLowerCase().includes(q));
  }, [initialServices, search]);

  async function handleDeactivate(service: ServiceDTO) {
    setDeactivatingId(service.id);
    const result = await deactivateService({ id: service.id });
    setDeactivatingId(null);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Servicio desactivado");
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
            aria-label="Buscar servicio"
            placeholder="Buscar servicio"
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
          Nuevo servicio
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">
                Servicio
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                C$
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                $
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Duración
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Comisión
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr
                key={service.id}
                className="border-b last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3 font-medium">{service.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {service.priceNio.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {service.priceUsd.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                  {service.durationMinutes} min
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                  {service.commissionPct != null
                    ? `${formatPercent(service.commissionPct)} fija`
                    : "default"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Editar ${service.name}`}
                      onClick={() => {
                        setEditing(service);
                        setFormOpen(true);
                      }}
                    >
                      <PencilLine className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Desactivar ${service.name}`}
                      disabled={deactivatingId === service.id}
                      onClick={() => handleDeactivate(service)}
                    >
                      {deactivatingId === service.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Sin servicios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editing ?? undefined}
      />
    </div>
  );
}
