---
name: create-page
description: "Use when creating a page or route in the Next.js App Router: (auth) vs (dashboard) placement, role gating for owner-only routes, metadata, loading.tsx/error.tsx skeletons, server data + TanStack Query initialData, responsive and accessibility checks. Triggers: página, page, ruta, route, dashboard."
---

# Skill: create-page

> Receta para crear una página/ruta. Dueños: **architect** (ubicación) +
> **frontend**. Lee `instructions/ui-rules.md`, `docs/permissions.md`.

## Paso 0 — Ubicación y acceso

```
src/app/(auth)/login/page.tsx                    # pública
src/app/(dashboard)/<modulo>/page.tsx            # privada (layout hace gating)
src/app/(dashboard)/<modulo>/[id]/page.tsx       # detalle
```

- Toda página bajo `(dashboard)` es privada; el rol se valida con
  `getAuthContext()` (server) + RLS. Rutas solo-owner (`/finance`, `/reports`,
  `/settings`): check de rol en la página (redirect a `/dashboard` si no es
  owner) — además del gating del middleware.

## Paso 1 — Estructura obligatoria por ruta

```
app/(dashboard)/clients/
├── page.tsx        # server component: datos + composición
├── loading.tsx     # skeletons (obligatorio)
├── error.tsx       # error boundary (obligatorio)
└── [id]/
    ├── page.tsx
    ├── loading.tsx
    └── error.tsx
```

## Paso 2 — Plantilla de page (Server Component)

```tsx
// src/app/(dashboard)/clients/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/features/auth/queries";
import { PageHeader } from "@/components/shared/page-header";
import { ClientsTable } from "@/features/clients/components/clients-table";
import { getClients } from "@/features/clients/queries";

export const metadata: Metadata = { title: "Clientes · CitaBella" };

export default async function ClientsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const clients = await getClients(); // respeta RLS; server-side

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" description="Administra tu clientela" />
      <ClientsTable initialData={clients} />
    </div>
  );
}
```

## Paso 3 — loading.tsx y error.tsx

```tsx
// loading.tsx — skeletons con la MISMA forma que el contenido
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
```

```tsx
// error.tsx — client component con reintento
"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-16 text-center">
      <p className="font-display text-lg">Algo salió mal</p>
      <button
        onClick={reset}
        className="mt-4 rounded-full bg-primary px-6 py-2 text-primary-foreground"
      >
        Reintentar
      </button>
    </div>
  );
}
```

## Paso 4 — Metadata y SEO interno

- `metadata.title` "· CitaBella" en cada página; `robots: noindex` (app privada).
- PWA: título coherente con bottom-nav.

## Paso 5 — Layout de datos

- Server: fetch directo con `queries/` del feature (no pasar por HTTP).
- Cliente: `initialData` desde el server → TanStack Query (`initialData` en
  `queryOptions`) para hidratar sin flash.
- Paginación server-side en listados grandes (clientes, historial).

## Paso 6 — Verificación

- [ ] Estados loading/error/empty presentes.
- [ ] Rol gating: página solo-owner redirige si `role !== "owner"`.
- [ ] Datos con RLS (probar como worker/receptionist).
- [ ] 375px → 1440px, dark mode, teclado, focus.
- [ ] `pnpm lint && pnpm typecheck` verde.
- [ ] Metadata y ruta revisados contra `docs/architecture.md`.

## Anti-patrones

- Lógica de dominio en la página (va en `features/`).
- `"use client"` en la página entera por conveniencia.
- Fetch sin manejo de error; fetch de dos queries secuenciales que podrían ir
  en paralelo (`Promise.all`).
