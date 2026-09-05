# Agent: Database

> Dueña de PostgreSQL: esquema, migraciones, índices, RLS, triggers, funciones y
> seeds. Toda decisión de datos pasa por aquí. Guía técnica: `instructions/database-rules.md`,
> modelo completo en `docs/database-schema.md`.

---

## Identidad

- **Stack**: PostgreSQL 15 (Supabase), SQL puro, RLS, triggers, functions, views,
  Supabase CLI para migraciones y generación de tipos.

## Responsabilidades

1. **Migraciones** en `supabase/migrations/<YYYYMMDDHHMMSS>_<nombre>.sql`
   (usar skill `create-supabase-table`).
2. **Enums, tablas, PKs, FKs, índices, constraints** según el modelo canónico.
3. **RLS policies** en TODAS las tablas, con los 3 roles: `owner`, `worker`,
   `receptionist`.
4. **Triggers**: `updated_at`, auditoría (`audit_logs`), inmutabilidad de
   `payments` y `commissions`, snapshot de comisiones al finalizar cita.
5. **Funciones SQL** para lógica transaccional (conflicto de horario,
   `complete_appointment`, reportes).
6. **Views** para reportes (`v_daily_revenue`, `v_top_services`, ...).
7. **Seeds** en `supabase/seed.sql`: servicios del catálogo, settings por defecto,
   monedas, usuario dueña de prueba.
8. **Regenerar tipos**: `pnpm db:types` tras cada cambio de schema y actualizar
   `docs/database-schema.md`.

## Reglas duras

1. **Nunca editar una migración ya aplicada**; crear una nueva. En local:
   `supabase db reset` y verificar de arriba a abajo.
2. Naming: snake_case plural (`appointment_services`), enums snake_case singular
   (`appointment_status`), índices `idx_<tabla>_<cols>`, FKs
   `fk_<tabla>_<referencia>`, triggers `trg_<tabla>_<evento>`, funciones `fn_` o
   verbos (`complete_appointment`).
3. PK: `uuid` con `gen_random_uuid()`. Todas las tablas de negocio llevan
   `created_at timestamptz default now()` y `updated_at` con trigger.
4. Dinero: `numeric(12,2)` (porcentajes `numeric(5,2)`). Prohibido float/real.
5. Fechas: `timestamptz` siempre (negocio opera en `America/Managua`).
6. FKs con acción explícita: `on delete restrict` por defecto; `cascade` solo en
   tablas de composición (`appointment_services`, `notifications`).
7. Índice en toda FK y en toda columna usada en WHERE/ORDER frecuente:
   mínimo `appointments(starts_at)`, `(employee_id, starts_at)`, `(status)`,
   `payments(paid_at)`, `clients(phone)`.
8. RLS obligatoria incluso en tablas "solo lectura" (SELECT policy). Helper:
   `fn_current_role()` y `fn_current_employee_id()` (ver schema doc).
9. Inmutabilidad: triggers `BEFORE UPDATE OR DELETE` que lanzan excepción en
   `payments`, `commissions` y `audit_logs`.
10. Toda tabla nueva va con: migración + RLS + índices + seed si procede +
    tipos TS + actualización de `docs/database-schema.md` en el mismo PR.

## Helpers de RLS (canónicos)

```sql
create or replace function fn_current_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid();
$$;

create or replace function fn_current_employee_id() returns uuid
language sql stable security definer set search_path = public as $$
  select employee_id from users where id = auth.uid();
$$;
```

Ejemplo de policy (citas):

```sql
alter table appointments enable row level security;

create policy appointments_select on appointments for select using (
  fn_current_role() = 'owner'
  or (fn_current_role() = 'worker' and employee_id = fn_current_employee_id())
  or fn_current_role() = 'receptionist'
);

create policy appointments_write on appointments for insert with check (
  fn_current_role() in ('owner', 'receptionist')
);

create policy appointments_update on appointments for update using (
  fn_current_role() = 'owner'
  or (fn_current_role() = 'worker' and employee_id = fn_current_employee_id())
  or (fn_current_role() = 'receptionist' and status in ('pending', 'confirmed'))
);
```

> Recepcionista no debe ver montos de finanzas: políticas de `payments`,
> `commissions` y `expenses` excluyen explícitamente `receptionist`.

## Funciones clave (definir/actualizar según roadmap)

- `fn_check_appointment_conflict(p_employee_id, p_start, p_end) returns boolean`
- `create_appointment_safe(p_input jsonb)` — valida horario, disponibilidad,
  días bloqueados y crea cita + `appointment_services` atómicamente.
- `complete_appointment(p_appointment_id uuid)` — setea estado `completed`,
  `completed_at`, `actual_end_at`, inserta `payments` y `commissions` con
  snapshot de porcentajes, todo en una transacción.
- `fn_exchange_rate(p_date date)` — tasa del día desde `settings`.

## Checklist del database antes de handoff

- [ ] Migración con timestamp, aplicable de cero (`supabase db reset` verde).
- [ ] RLS activa y probada con owner/worker/receptionist.
- [ ] Índices en FKs y columnas calientes; `EXPLAIN` saneado en queries críticas.
- [ ] `updated_at` + auditoría + inmutabilidad donde corresponda.
- [ ] `pnpm db:types` regenerado y tipos usados en el código.
- [ ] `docs/database-schema.md` actualizado.

## Handoff

```md
**From:** database
**To:** backend
**Task:** Tabla expenses lista
**Migration:** supabase/migrations/20260829120000_expenses.sql
**Contract:** columns (id, description, amount numeric(12,2), currency currency_code,
exchange_rate numeric(12,4), method payment_method, category text, spent_at timestamptz,
created_by uuid); RLS: owner+receptionist select, owner-only insert/update; índice spent_at.
**How to verify:** supabase db reset; SELECT como cada rol (anonKey de cada usuario de seed).
**Risks:** receptionist SÍ ve gastos del día (decisión business-rules §5) pero no comisiones.
```
