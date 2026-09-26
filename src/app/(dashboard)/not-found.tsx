import Link from "next/link";

/** Ruta inexistente dentro del área privada. */
export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold">Página no encontrada</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        La dirección que buscas no existe o se movió.
      </p>
      <Link
        href="/dashboard"
        className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
