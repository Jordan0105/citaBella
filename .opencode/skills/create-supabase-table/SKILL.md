---
name: create-supabase-table
description: "Use when creating or modifying Supabase tables: migration file, SQL template (uuid PK, FKs, indexes, updated_at trigger), RLS policies for the 3 roles, transactional SQL functions, seeds, type regeneration and RLS verification per role. Triggers: tabla, table, migración, migration, supabase, RLS, enum, índice."
---

# Skill: create-supabase-table

> Receta completa para crear una tabla en Supabase. Dueño: **database**,
> revisa **security**. Lee `instructions/database-rules.md` y
> `docs/database-schema.md` (modelo canónico).

## Paso 1 — Crear la migración

```bash
supabase migration new <nombre_snake>   # crea supabase/migrations/<ts>_<nombre>.sql
```

## Paso 2 — Plantilla SQL (copiar y adaptar TODO)

```sql
-- supabase/migrations/20260829120000_notifications.sql

-- ============ ENUMS (si aplica) ============
-- create type notification_type as enum ('reminder', 'cancellation', 'system');

-- ============ TABLA ============
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fk_notifications_user foreign key (user_id) references users (id)
);

comment on table notifications is 'Notificaciones in-app por usuario (owner/worker).';

-- ============ ÍNDICES ============
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);

-- ============ TRIGGER updated_at ============
create trigger trg_notifications_updated_at
  before update on notifications
  for each row execute function set_updated_at();

-- ============ RLS ============
alter table notifications enable row level security;

create policy notifications_select on notifications
  for select using (user_id = auth.uid() or fn_current_role() = 'owner');

create policy notifications_update on notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_insert on notifications
  for insert with check (fn_current_role() = 'owner');

-- ============ AUDITORÍA (tablas sensibles) ============
create trigger trg_notifications_audit
  after update or delete on notifications
  for each row execute function audit_row('notifications');
```

## Paso 3 — Checklist SQL

- [ ] PK uuid `gen_random_uuid()`; FKs con acción de borrado explícita.
- [ ] `created_at`/`updated_at` + trigger `set_updated_at`.
- [ ] `numeric(12,2)` para dinero; `timestamptz` para tiempos; CHECKs de negocio.
- [ ] Índice en toda FK y columnas de filtro habitual.
- [ ] RLS habilitada + policies para owner/worker/receptionist (recordar:
      receptionist sin acceso a `payments`, `commissions`, `expenses`).
- [ ] Inmutabilidad (triggers) si es tabla de dinero/auditoría.
- [ ] Comentarios `comment on` para decisiones no obvias.

## Paso 4 — Si la tabla participa en lógica transaccional

Agregar la function SQL en la misma migración (o una consecutiva):

```sql
create or replace function mi_operacion_safe(p_input jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if fn_current_role() is null then raise exception 'UNAUTHORIZED'; end if;
  -- validaciones + escrituras atómicas
  -- raise exception 'SLOT_TAKEN' when conflicto
  return jsonb_build_object('ok', true, ...);
end $$;
```

## Paso 5 — Seed (si procede)

En `supabase/seed.sql` — datos sintéticos (NUNCA clientes reales):

```sql
insert into notifications (user_id, type, title, body)
select id, 'system', 'Bienvenida', 'Bienvenida a CitaBella'
from users where role = 'owner'
on conflict do nothing;
```

## Paso 6 — Tipos y docs

```bash
supabase db reset          # aplica TODO desde cero (debe quedar limpio)
pnpm db:types              # regenera src/types/db.generated.ts
```

- Actualizar `docs/database-schema.md` (tabla, relaciones, RLS) en el mismo PR.

## Paso 7 — Probar RLS con los 3 roles

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-worker>"}';
select * from notifications;  -- verificar qué ve cada rol
rollback;
```

## Handoff esperado

```md
**From:** database
**To:** backend
**Migration:** <ts>_<nombre>.sql
**Contract:** columnas + RPC creado (si aplica) + qué ve cada rol.
**How to verify:** supabase db reset + queries por rol del paso 7.
**Risks:** <cualquier suposición de negocio tomada>
```
