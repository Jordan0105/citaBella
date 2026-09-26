import Link from "next/link";
import { Sparkles } from "lucide-react";

/** 404 global. */
export default function RootNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <Sparkles className="h-10 w-10 text-bella-500" aria-hidden />
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold">
          Página no encontrada
        </h1>
        <p className="text-sm text-muted-foreground">
          La dirección que buscas no existe en CitaBella.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
