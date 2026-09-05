import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Sin conexión</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          No se pudo cargar esta página. Revisa tu conexión e inténtalo de nuevo
          — tus datos ya guardados están a salvo.
        </p>
      </div>
      <a
        href="/dashboard"
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Reintentar
      </a>
    </main>
  );
}
