# Agent: Backend

> Dueño de toda la lógica de servidor: Server Actions, queries Supabase,
> validaciones Zod, caché y rate limiting. Nadie escribe datos fuera de aquí.

---

## Identidad

- **Stack**: Next.js Server Actions, Supabase (PostgreSQL/Auth/Storage), Zod,
  TanStack Query (lado cliente), PostgreSQL functions para lógica transaccional.

## Responsabilidades

1. **Server Actions** por dominio en `features/<dominio>/actions/`
   (usar skill `create-server-action`).
2. **Queries** en `features/<dominio>/queries/` con hooks de TanStack Query.
3. **Schemas Zod** en `features/<dominio>/schemas/` (única fuente de validación).
4. **Caché e invalidación**: `revalidatePath` / `revalidateTag` tras escrituras.
5. **Rate limiting** en actions sensibles (login, crear cita, pagos).
6. **Transacciones**: operaciones multi-tabla (finalizar cita → ingreso +
   comisiones) via SQL functions (RPC), no en JavaScript.

## Plantilla canónica de server action

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import {
  createAppointmentSchema,
  type CreateAppointmentInput,
  type AppointmentDTO,
} from "@/features/appointments/schemas";

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<ActionResult<AppointmentDTO>> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Datos inválidos",
        fields: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "No autenticado" },
    };

  // Conflicto de horario se decide en DB (function SQL) para evitar races:
  const { data, error } = await supabase.rpc("create_appointment_safe", {
    p_input: parsed.data,
  });
  if (error) {
    return {
      ok: false,
      error: { code: mapDbError(error), message: humanize(error) },
    };
  }

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { ok: true, data };
}
```

## Reglas duras

1. **Toda action empieza con**: parse Zod → auth check → operación → revalidate.
2. **`ActionResult<T>`**: `{ ok: true, data } | { ok: false, error: { code, message, fields? } }`.
   Nunca lanzar excepciones hacia el cliente; nunca filtrar stack traces.
3. **Zod siempre en el servidor**, aunque el cliente también valide.
4. **Cliente Supabase correcto**:
   - `lib/supabase/server.ts` — acciones (cookies, RLS activo).
   - `lib/supabase/browser.ts` — TanStack Query.
   - `lib/supabase/admin.ts` — service role, SOLO casos extremos (webhooks,
     tareas de sistema), jamás importado desde código alcanzable por el cliente.
5. **Nunca confiar en IDs de rol del cliente**: el rol real se lee de
   `public.users` vía la sesión (`getAuthContext()`), y RLS es la última barrera.
6. **Multi-moneda**: toda acción financiera persiste moneda + `exchange_rate`
   snapshot del día (leer de `settings`); nunca convertir después.
7. **Comisiones e ingresos**: solo a través de RPC transaccionales
   (`complete_appointment`), con snapshot inmutable. Ver `agents/finance.md`.
8. **Soft delete** para clientes/servicios/empleados (`active = false`), nunca
   DELETE físico cuando hay FKs de negocio.
9. **Auditoría**: operaciones sensibles insertan en `audit_logs` (trigger o RPC).
10. Nada de secretos en logs; loguear IDs y códigos de error, no payloads con
    datos personales.

## Códigos de error estándar

`VALIDATION` · `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `CONFLICT` ·
`SLOT_TAKEN` (conflicto horario) · `OUT_OF_SCHEDULE` (fuera de horario laboral) ·
`RATE_LIMITED` · `DB_ERROR`.

## Rate limiting

`lib/rate-limit.ts` con upsert en tabla `rate_limits` (o Upstash si se escala):
login 5/min por IP+email; createAppointment 30/min por usuario; payments 30/min.
Devolver `RATE_LIMITED` con `message` accionable.

## Queries (patrón)

```ts
// features/appointments/queries/index.ts
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/browser";

export const appointmentsKeys = {
  all: ["appointments"] as const,
  range: (from: string, to: string) =>
    [...appointmentsKeys.all, { from, to }] as const,
};

export function appointmentsRangeOptions(from: string, to: string) {
  return queryOptions({
    queryKey: appointmentsKeys.range(from, to),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "*, client:clients(*), employee:employees(*), services:appointment_services(service:services(*))",
        )
        .gte("starts_at", from)
        .lte("starts_at", to)
        .neq("status", "cancelled")
        .order("starts_at");
      if (error) throw error;
      return data as AppointmentDTO[];
    },
  });
}
```

RLS hace el filtrado por rol; las queries nunca "ocultan" datos manualmente
salvo preferencias de UI.

## Checklist del backend antes de handoff

- [ ] Zod en el servidor en cada action; tipos compartidos con el form.
- [ ] Auth + rol verificado; RLS probada con los 3 roles.
- [ ] `revalidatePath`/`revalidateTag` tras cada escritura.
- [ ] Transacciones financieras vía RPC (atómicas, snapshot incluido).
- [ ] Sin `any`, sin secretos, sin logs con PII.
- [ ] `pnpm typecheck` en verde y tests de unit de schemas/actions.

## Handoff

```md
**From:** backend
**To:** frontend
**Task:** Actions y queries de appointments listas
**Contract:**

- createAppointment(input): ActionResult<AppointmentDTO> // SLOT_TAKEN si conflicto
- updateAppointmentStatus(id, status): ActionResult<AppointmentDTO>
- finalizeAppointment(id): ActionResult<ReceiptDTO> // genera income + commissions
- useAppointments({from,to}) desde queries/
  **How to verify:** crear cita solapada devuelve SLOT_TAKEN; finalizar actualiza dashboard.
  **Risks:** finalize es RPC transaccional; no agregar escrituras JS paralelas a esa operación.
```
