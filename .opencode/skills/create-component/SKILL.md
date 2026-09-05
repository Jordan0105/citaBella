---
name: create-component
description: "Use when creating or reviewing any React/TSX component in CitaBella: decide server vs client, justify each 'use client', placement (feature/domain vs components/ui vs components/shared), styling tokens and dark mode, accessibility, kebab-case filenames, PascalCase exports, and the component checklist. Triggers: componente, component, .tsx, nuevo componente, React."
---

# Skill: create-component

> Receta para crear cualquier componente de CitaBella. Dueño: **frontend**,
> revisa **uiux**. Lee antes `instructions/ui-rules.md` y `agents/frontend.md`.

## Paso 0 — Clasificar

| Pregunta                                  | Si sí                                 | Si no      |
| ----------------------------------------- | ------------------------------------- | ---------- |
| ¿Es del dominio (cita, cliente, pago...)? | `src/features/<dominio>/components/`  | continúa   |
| ¿Es primitivo visual reutilizable?        | `src/components/ui/` (shadcn primero) | continúa   |
| ¿Es widget de app reutilizable?           | `src/components/shared/`              | replantear |

## Paso 1 — Decidir server vs client

- Server Component por defecto.
- `"use client"` SOLO si: estado, eventos, efectos, formularios, hooks de
  browser, o librería client-only (FullCalendar, charts, drawer interactivo).
- Si el componente contiene un `children` renderizado por el server, hacer el
  wrapper client mínimo y pasar children como prop (los children siguen siendo
  server components).

## Paso 2 — Plantilla (Server Component)

```tsx
// src/features/appointments/components/appointment-card.tsx
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/money";
import type { AppointmentDTO } from "../types";

interface AppointmentCardProps {
  appointment: AppointmentDTO;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{appointment.client.name}</p>
        <StatusBadge status={appointment.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {appointment.service.name} ·{" "}
        {formatMoney(appointment.price, appointment.currency)}
      </p>
    </Card>
  );
}
```

## Paso 3 — Plantilla (Client Component)

```tsx
"use client";
// src/features/appointments/components/appointment-status-toggle.tsx
import { useState, useTransition } from "react";
import { updateAppointmentStatus } from "../actions";
import type { AppointmentStatus } from "../types";

interface Props {
  appointmentId: string;
  status: AppointmentStatus;
}

export function AppointmentStatusToggle({ appointmentId, status }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(next: AppointmentStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateAppointmentStatus({
        id: appointmentId,
        status: next,
      });
      if (!result.ok) setError(result.error.message);
    });
  }
  // ...UI con disabled={isPending} y aria-live para error
}
```

## Paso 4 — Reglas de estilo (no negociables)

- Colores solo con tokens (`bg-background`, `text-foreground`, `bella-*`).
- Mobile first: estilos base 375px, progresión `md:`/`lg:`.
- Íconos Lucide; fechas con helpers de `lib/dates.ts`; dinero con
  `formatMoney` de `lib/money.ts`.
- Estados internos si lista datos: loading/empty/error arriba del componente
  o en el padre (documentar quién los maneja).

## Paso 5 — Accesibilidad

- Elemento semántico correcto; labels `htmlFor`; focus visible;
  targets ≥ 44px; `aria-hidden` en iconos decorativos.

## Paso 6 — Verificación

- [ ] `pnpm lint && pnpm typecheck` verde.
- [ ] 375px y dark mode verificados.
- [ ] Props tipadas, sin `any`; nombre kebab-case del archivo, PascalCase del
      componente (`naming-conventions.md`).
- [ ] Export nombrado (no default) para components de features.

## Anti-patrones

- Fetch de datos dentro del componente (usar `queries/` o props del server).
- Lógica de negocio inline (va en `actions/`, `lib/` o SQL).
- Duplicar un componente que ya existe en `shared/`.
- `useEffect` para derivar estado (derivar en render).
