---
name: create-server-action
description: "Use when creating or modifying Server Actions: 'use server' pattern, ActionResult contract, Zod validation on the server, rate limiting, auth/role checks, transactional RPC for money, revalidatePath and client mutation integration. Reads belong in queries/queryOptions, not actions. Triggers: server action, action, mutación, mutation, 'use server'."
---

# Skill: create-server-action

> Plantilla completa para una Server Action. Dueño: **backend**. Lee
> `agents/backend.md` y `instructions/project-rules.md` antes de usar.

## Paso 0 — Ubicación

```
src/features/<dominio>/actions/<verbo-entidad>.ts   # una action por archivo
```

## Paso 1 — Firma estándar

```ts
export async function <verboEntidad>(input: <Entidad>Input): Promise<ActionResult<<Entidad>DTO>>
```

- `ActionResult<T>` definido una vez en `src/types/action-result.ts`:

```ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ErrorCode;
        message: string;
        fields?: Record<string, string[]>;
      };
    };

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SLOT_TAKEN"
  | "OUT_OF_SCHEDULE"
  | "RATE_LIMITED"
  | "DB_ERROR";
```

## Paso 2 — Plantilla completa (copiar y adaptar)

```ts
"use server";
// src/features/appointments/actions/create-appointment.ts

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types/action-result";
import {
  createAppointmentSchema,
  type CreateAppointmentInput,
  type AppointmentDTO,
} from "../../schemas";
import { getAuthContext } from "@/features/auth/queries";

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<ActionResult<AppointmentDTO>> {
  // 1. Validación Zod (servidor, siempre)
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

  // 2. Rate limit (operaciones sensibles)
  if (!(await rateLimit("createAppointment", { max: 30, windowSec: 60 }))) {
    return {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Demasiadas operaciones, intenta en un minuto",
      },
    };
  }

  // 3. Auth + rol (el servidor decide, nunca el cliente)
  const auth = await getAuthContext();
  if (!auth)
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Inicia sesión" },
    };
  if (!["owner", "receptionist", "worker"].includes(auth.role)) {
    return { ok: false, error: { code: "FORBIDDEN", message: "Sin permisos" } };
  }

  // 4. Operación (lógica crítica en RPC transaccional; RLS como barrera final)
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_appointment_safe", {
    p_input: parsed.data,
  });
  if (error) {
    const code =
      error.code === "SLOT_TAKEN"
        ? "SLOT_TAKEN"
        : error.code === "OUT_OF_SCHEDULE"
          ? "OUT_OF_SCHEDULE"
          : "DB_ERROR";
    return {
      ok: false,
      error: { code, message: humanizeAppointmentError(code) },
    };
  }

  // 5. Invalidación de caché
  revalidatePath("/calendar");
  revalidatePath("/dashboard");

  return { ok: true, data: data as AppointmentDTO };
}
```

## Paso 3 — Variantes

### Update / soft delete

- Update: schema `partial` + `id` uuid validado; verificar propiedad (RLS o
  check manual si RLS no cubre la regla fina).
- Soft delete: `deactivateClient(id)` → `active = false`; jamás `delete()`.
- Registros inmutables (`payments`, `commissions`): no existen actions de
  update/delete; correcciones = action de "ajuste" que inserta movimientos.

### Operación financiera

- SIEMPRE RPC transaccional (`finalize_appointment`), nunca JS multi-step.
- Snapshot de moneda/tasa/porcentaje dentro del RPC. Reglas: `agents/finance.md`.

### Lectura

- Lecturas NO van en actions: van en `queries/` (server components) o
  `queryOptions` (cliente). Las actions son para **escrituras** y comandos.

## Paso 4 — Integración cliente

```ts
// mutations con invalidación quirúrgica
const queryClient = useQueryClient();
const { mutateAsync } = useMutation({
  mutationFn: createAppointment,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
  },
});
```

## Paso 5 — Tests mínimos

- Unit del schema (happy + cada regla de validación).
- Test de la action mockeando `supabase.rpc` para cada ErrorCode.
- E2E del flujo si es crítico (crear/finalizar cita).

## Checklist de la action

- [ ] `"use server"` al inicio; archivo dedicado por action.
- [ ] Zod → rate limit (si aplica) → auth/rol → operación → revalidate.
- [ ] Devuelve `ActionResult<T>`; cero throws hacia el cliente.
- [ ] Códigos de error del set estándar; mensajes humanos en español.
- [ ] RPC transaccional si toca dinero o multi-tabla.
- [ ] RLS probada con los 3 roles (handoff a security).
- [ ] Sin PII en logs; sin secretos.
