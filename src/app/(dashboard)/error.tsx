"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardErrorProps {
  error: Error;
  reset: () => void;
}

/** Boundary de error para todo el área privada: mensaje humano + reintento. */
export default function DashboardError({ reset }: DashboardErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center"
    >
      <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold">Algo salió mal</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          No pudimos cargar esta sección. Revisa tu conexión e intenta de nuevo;
          si persiste, avísale a la dueña del salón.
        </p>
      </div>
      <Button onClick={reset} className="rounded-full">
        <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
        Reintentar
      </Button>
    </div>
  );
}
