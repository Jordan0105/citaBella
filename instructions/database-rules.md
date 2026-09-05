# database-rules.md — Reglas de base de datos

> Todo lo que toca PostgreSQL. Detalle técnico del esquema: `docs/database-schema.md`.

## Naming

| Elemento      | Convención                    | Ejemplo                                         |
| ------------- | ----------------------------- | ----------------------------------------------- |
| Tablas        | snake_case **plural**         | `appointment_services`                          |
| Columnas      | snake_case singular           | `starts_at`, `employee_id`                      |
| Enums         | snake_case singular           | `appointment_status`                            |
| Booleanos     | prefijo `is_/has_/can_`       | `is_active`                                     |
| Timestamps    | sufijo `_at`                  | `created_at`, `completed_at`                    |
| Fechas puras  | sufijo `_date` o nombre claro | `birth_date`, `blocked_date`                    |
| PK            | `id` uuid                     | `id uuid primary key default gen_random_uuid()` |
| FK columna    | `<referencia>_id`             | `client_id`                                     |
| FK constraint | `fk_<tabla>_<referencia>`     | `fk_appointments_employee`                      |
| Índice        | `idx_<tabla>_<cols>`          | `idx_appointments_employee_starts`              |
| Unique        | `uq_<tabla>_<cols>`           | `uq_users_email`                                |
| Trigger       | `trg_<tabla>_<evento>`        | `trg_payments_no_update`                        |
| Función       | verbo + sustantivo            | `complete_appointment`                          |
| Vista         | `v_<descripción>`             | `v_daily_revenue`                               |

## Tipos

- PK: `uuid` + `gen_random_uuid()`.
- Dinero: `numeric(12,2)`; porcentajes: `numeric(5,2)` con CHECK 0–100.
  **Prohibido** `float`, `real`, `double precision` para dinero.
- Tiempo: `timestamptz` (nunca `timestamp` sin tz); horas del día: `time`.
- Texto: `text` (no `varchar(n)` arbitrario; usar CHECK si hay límite).
- Booleans NOT NULL con default.
- `jsonb` para datos flexibles (`settings.value`, `audit_logs.old_data`).

## Estructura obligatoria por tabla de negocio

1. `id uuid pk default gen_random_uuid()`.
2. `created_at timestamptz not null default now()`.
3. `updated_at timestamptz not null default now()` + trigger `set_updated_at`.
4. FKs con `on delete restrict` (default) o `cascade` (solo composición).
5. `comment on table/column` para decisiones no obvias.

## RLS (obligatorio en TODAS las tablas)

1. `alter table ... enable row level security;` siempre.
2. Policies explícitas por operación (select/insert/update/delete).
3. Roles via helpers `fn_current_role()` y `fn_current_employee_id()`
   (`security definer`, `stable`).
4. `receptionist` jamás debe tener acceso (ni select) a `payments`,
   `commissions`, `expenses` ni reportes financieros.
5. `worker` ve solo sus filas (por `employee_id`).
6. `owner` acceso completo.
7. Tablas de auditoría: solo insert; sin update/delete para nadie.
8. `security_invoker = true` en todas las views (heredan RLS).

## Inmutabilidad

`payments`, `commissions`, `audit_logs`: trigger `BEFORE UPDATE OR DELETE` que
lanza `exception 'IMMUTABLE_RECORD'`. Correcciones = movimientos de ajuste.

## Migraciones

1. Archivo: `supabase/migrations/YYYYMMDDHHMMSS_<snake_name>.sql`.
2. Nunca editar una migración ya aplicada (aunque sea en local compartido).
3. Cada migración es idempotente cuando es posible (`if not exists`), pero el
   historial es la verdad.
4. Probar con `supabase db reset` desde cero antes del PR.
5. Migraciones destructivas (drop column/table) solo con:
   - motivo documentado en comentario SQL,
   - plan de 2 releases (deprecar → eliminar),
   - backup confirmado.
6. Seeds van en `supabase/seed.sql` (catálogo de servicios, settings, monedas,
   usuarios de prueba) — nunca datos reales de clientes.

## Índices mínimos

```sql
create index idx_appointments_starts_at on appointments (starts_at);
create index idx_appointments_employee_starts on appointments (employee_id, starts_at);
create index idx_appointments_status on appointments (status);
create index idx_appointments_client on appointments (client_id);
create index idx_payments_paid_at on payments (paid_at);
create index idx_expenses_spent_at on expenses (spent_at);
create index idx_commissions_created_at on commissions (created_at);
create index idx_clients_phone on clients (phone);
```

Regla: índice en toda FK; índice compuesto cuando el patrón de consulta es
fijo (empleado + rango de fechas). Verificar planes con `EXPLAIN ANALYZE`.

## Triggers base

- `set_updated_at`: genérico, se reutiliza por tabla.
- `audit_row`: inserta en `audit_logs` en UPDATE/DELETE de tablas sensibles
  (users, employees, services, settings, commissions pct overrides).
- `block_mutation`: para tablas inmutables.

## Integridad de negocio

- Conflictos de horario, disponibilidad y finalización con pagos: en **funciones
  SQL transaccionales**, no en JS (ver `docs/database-schema.md` §Funciones).
- CHECKs de negocio: `price >= 0`, `discount between 0 and price`,
  `commission_pct between 0 and 100`, `end_time > start_time`.

## Generación de tipos

Después de toda migración:

```bash
pnpm db:types   # supabase gen types typescript --local > src/types/db.generated.ts
```
