---
name: create-form
description: "Use when creating or modifying forms with React Hook Form + Zod + shadcn/ui: shared server/client schema as single source of truth, TanStack Query mutations, server field errors, special inputs (MoneyInput, PhoneInput, EmployeeSelector, ServiceSelector, CurrencySwitch), America/Managua dates and mobile-first rules. Triggers: formulario, form, react-hook-form, zodResolver, schema."
---

# Skill: create-form

> Receta para formularios: React Hook Form + Zod + shadcn/ui. Dueños:
> **frontend** + **backend** (schema compartido). Lee `instructions/ui-rules.md`.

## Paso 0 — El schema es la fuente única

El schema Zod vive en `src/features/<dominio>/schemas/` y lo usan el form
(cliente) Y la server action (servidor). Si el form necesita reglas de UI
(campos opcionales en draft), hacer `<Entidad>FormSchema` que extienda el
canónico, nunca duplicar.

## Paso 1 — Schemas de dominio reutilizables (ya definidos)

```ts
// src/lib/phone.ts
export const phoneNicSchema = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(
        /^(\+?505)?[278]\d{7}$/,
        "Teléfono inválido: 8 dígitos, ej. 8412 3456",
      ),
  );

// src/lib/money.ts
export const moneySchema = z
  .number()
  .nonnegative("El monto no puede ser negativo");
export const pctSchema = z
  .number()
  .min(0)
  .max(100, "El porcentaje va de 0 a 100");
```

## Paso 2 — Plantilla completa (Form de cita como referencia)

```tsx
"use client";
// src/features/appointments/components/appointment-form.tsx

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAppointment } from "../actions";
import {
  createAppointmentSchema,
  type CreateAppointmentInput,
} from "../schemas";
import { appointmentsKeys } from "../queries";

interface AppointmentFormProps {
  defaultDate?: string;
}

export function AppointmentForm({ defaultDate }: AppointmentFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: { startsAt: defaultDate, currency: "NIO", discount: 0 },
  });

  const mutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
      form.reset();
      toast({ title: "Cita creada" });
    },
    onError: (err) => {
      // errores de campo del servidor
      if (err.fields)
        for (const [k, msgs] of Object.entries(err.fields)) {
          form.setError(k as keyof CreateAppointmentInput, {
            message: msgs[0],
          });
        }
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => mutation.mutateAsync(v))}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <FormControl>
                <ClientSelector value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* ...employeeId, serviceId, startsAt, currency, price, discount, notes... */}
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="w-full sm:w-auto"
        >
          {mutation.isPending ? "Guardando..." : "Crear cita"}
        </Button>
      </form>
    </Form>
  );
}
```

## Paso 3 — Reglas del form

- Validación al blur/change; submit solo con todo válido.
- `disabled={mutation.isPending}` en submit; spinner inline.
- Errores del servidor → `form.setError` campo por campo; errores globales en
  un `FormError` arriba del form.
- Moneda: `CurrencySwitch` controla el símbolo de `MoneyInput` y los límites.
- Fechas/horas: inputs con tz `America/Managua` (helpers `lib/dates.ts`),
  nunca construir Date con el tz del dispositivo.
- Móvil: 1 columna; teclados correctos (`inputMode`); labels siempre visibles.

## Paso 4 — Campos especiales (usar shared, no improvisar)

| Campo          | Componente                                                 |
| -------------- | ---------------------------------------------------------- |
| Dinero         | `MoneyInput` (símbolo según moneda, `inputMode="decimal"`) |
| Teléfono NIC   | `PhoneInput` (prefijo +505, formateo 8 dígitos)            |
| Método de pago | `PaymentMethodSelector`                                    |
| Trabajadora    | `EmployeeSelector` (avatar + color)                        |
| Servicio       | `ServiceSelector` (filtra precio/duración al elegir)       |
| Estado cita    | `StatusBadge` + acciones (no select libre)                 |

## Paso 5 — Verificación

- [ ] Schema Zod compartido con la action (misma fuente).
- [ ] Errores de servidor visibles campo por campo.
- [ ] 375px: form usable con una mano; dark mode ok.
- [ ] Teclado: tab orden correcto, Enter envía, focus al primer error.
- [ ] `pnpm lint && pnpm typecheck` + test del schema en verde.

## Anti-patrones

- Duplicar validaciones JS en vez de confiar en el schema.
- `watch()` en todo el form (re-renders) — usar campos controlados puntuales.
- Formularios gigantes de 1 archivo (> 300 líneas): dividir en FieldGroups.
- Placeholder como única etiqueta.
