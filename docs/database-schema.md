# database-schema.md — Modelo de datos

> Dueño: **database**. Fuente canónica del esquema PostgreSQL de CitaBella.
> Convenciones técnicas en `instructions/database-rules.md`.

---

## 1. Diagrama entidad–relación (lógico)

```
users ──1:1── employees (opcional)
  │
  ├──1:N── audit_logs (actor)
  └──1:N── notifications

clients ──1:N── appointments ──N:1── employees
                    │ 1:N appointment_services ──N:1── services
                    ├──1:N── payments   (inmutable)
                    └──1:N── commissions (inmutable)

employees ──1:N── availability   (horario semanal)
employees ──1:N── blocked_dates  (días libres/vacaciones/bloqueos)
services  ──1:N── appointment_services
settings (key/value) · currencies · expenses · audit_logs
```

---

## 2. Enums

```sql
create type user_role as enum ('owner', 'worker', 'receptionist');

create type appointment_status as enum (
  'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
);

create type payment_method as enum ('cash', 'transfer', 'card');

create type currency_code as enum ('NIO', 'USD');

create type expense_category as enum (
  'supplies', 'rent', 'utilities', 'salary_advance', 'marketing', 'other'
);
```

---

## 3. Tablas

### users — perfiles de acceso

```sql
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'receptionist',
  employee_id uuid references employees (id),   -- para role='worker'
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

> Trigger `on_auth_user_created`: inserta fila aquí al registrarse en auth.
> `receptionist` y `worker` con `employee_id` null/no-null según rol.

### employees — trabajadoras

```sql
create table employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id),
  full_name text not null,
  specialty text,                                -- 'colorista', 'uñas'...
  color text not null default '#B7A6E3',         -- color en calendario
  commission_pct numeric(5,2) check (commission_pct is null or commission_pct between 0 and 100),
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### clients — clientela

```sql
create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,                           -- NIC: +505 + 8 dígitos
  whatsapp text,
  email text,
  birth_date date check (birth_date < current_date),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_clients_phone on clients (phone);
```

### services — catálogo

```sql
create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,                            -- 'Corte mujer', 'Keratina'...
  description text,
  price_nio numeric(12,2) not null check (price_nio >= 0),
  price_usd numeric(12,2) not null check (price_usd >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  commission_pct numeric(5,2) check (commission_pct is null or commission_pct between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### appointments — citas

```sql
create table appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id),
  employee_id uuid not null references employees (id),
  service_id uuid references services (id),      -- servicio principal (rápido)
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  actual_end_at timestamptz,                     -- hora final real
  status appointment_status not null default 'pending',
  currency currency_code not null default 'NIO',
  price numeric(12,2) not null check (price >= 0),
  discount numeric(12,2) not null default 0 check (discount between 0 and price),
  exchange_rate numeric(12,4),                   -- snapshot NIO/USD al crear
  notes text,
  created_by uuid references users (id),
  completed_at timestamptz,                      -- "Cita realizada"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_appointments_starts_at on appointments (starts_at);
create index idx_appointments_employee_starts on appointments (employee_id, starts_at);
create index idx_appointments_status on appointments (status);
create index idx_appointments_client on appointments (client_id);
```

### appointment_services — múltiples servicios por cita

```sql
create table appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  service_id uuid not null references services (id),
  price numeric(12,2) not null check (price >= 0),      -- precio al momento
  discount numeric(12,2) not null default 0,
  currency currency_code not null,
  duration_minutes integer not null
);
create index idx_appointment_services_appointment on appointment_services (appointment_id);
```

### payments — ingresos (INMUTABLE)

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments (id),   -- null = ingreso directo
  amount numeric(12,2) not null check (amount >= 0),
  tip numeric(12,2) not null default 0,
  currency currency_code not null,
  exchange_rate numeric(12,4) not null,               -- snapshot del día
  method payment_method not null,
  paid_at timestamptz not null default now(),
  received_by uuid references users (id),
  notes text,
  created_at timestamptz not null default now()
);
create index idx_payments_paid_at on payments (paid_at);
create index idx_payments_appointment on payments (appointment_id);
-- trigger trg_payments_immutable: bloquea UPDATE/DELETE
```

### commissions — comisiones snapshot (INMUTABLE)

```sql
create table commissions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id),
  employee_id uuid not null references employees (id),
  service_id uuid references services (id),
  base_amount numeric(12,2) not null,                 -- precio − descuento
  currency currency_code not null,
  exchange_rate numeric(12,4) not null,
  employee_pct numeric(5,2) not null,                 -- snapshot
  employee_amount numeric(12,2) not null,
  owner_pct numeric(5,2) not null,
  owner_amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index idx_commissions_created_at on commissions (created_at);
create index idx_commissions_employee on commissions (employee_id, created_at);
-- trigger trg_commissions_immutable: bloquea UPDATE/DELETE
-- CHECK employee_amount + owner_amount = base_amount (tolerancia 0.01)
```

### expenses — gastos de caja

```sql
create table expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency currency_code not null,
  exchange_rate numeric(12,4) not null,
  method payment_method not null default 'cash',
  category expense_category not null default 'other',
  spent_at timestamptz not null default now(),
  created_by uuid references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_expenses_spent_at on expenses (spent_at);
```

### availability — horario semanal por trabajadora

```sql
create table availability (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),  -- 0=domingo
  start_time time not null,
  end_time time not null check (end_time > start_time),
  is_active boolean not null default true,
  unique (employee_id, weekday)
);
```

### blocked_dates — días libres, vacaciones, bloqueos

```sql
create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees (id) on delete cascade, -- null = todo el salón
  blocked_date date not null,
  reason text,
  created_by uuid references users (id),
  created_at timestamptz not null default now(),
  unique (employee_id, blocked_date)
);
create index idx_blocked_dates_date on blocked_dates (blocked_date);
```

### settings — configuración global (key/value)

```sql
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
-- Seeds:
-- default_commission_owner  : {"pct": 45}
-- default_commission_worker : {"pct": 55}
-- default_currency          : {"code": "NIO"}
-- exchange_rate             : {"nio_per_usd": 36.80, "updated_at": ...}
-- salon_info                : {"name": "...", "phone": "...", "address": "..."}
-- business_hours            : {"open": "08:00", "close": "19:00", "days": [1..6]}
```

### currencies — catálogo de monedas

```sql
create table currencies (
  code text primary key,                          -- 'NIO' | 'USD'
  name text not null,
  symbol text not null,
  exchange_rate_to_nio numeric(12,4),             -- solo USD tiene valor
  updated_at timestamptz not null default now()
);
```

### audit_logs — auditoría (solo insert)

```sql
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor uuid references users (id),
  table_name text not null,
  record_id uuid,
  action text not null,                           -- 'insert'|'update'|'delete'|'rpc:<fn>'
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_table_record on audit_logs (table_name, record_id);
-- trigger trg_audit_no_mutation: bloquea UPDATE/DELETE
```

### notifications — notificaciones in-app

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null default 'system',            -- 'reminder'|'cancellation'|'system'
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_notifications_user on notifications (user_id, created_at desc);
```

---

## 4. Funciones SQL (lógica transaccional)

| Función                                                                                          | Propósito                                                                                                                          |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `set_updated_at()`                                                                               | trigger genérico `updated_at`                                                                                                      |
| `audit_row(p_table)`                                                                             | trigger de auditoría a `audit_logs`                                                                                                |
| `block_mutation()`                                                                               | trigger de inmutabilidad (`payments`, `commissions`, `audit_logs`)                                                                 |
| `fn_current_role() returns user_role`                                                            | rol del JWT desde `users`                                                                                                          |
| `fn_current_employee_id() returns uuid`                                                          | employee_id del JWT                                                                                                                |
| `fn_check_appointment_conflict(p_employee, p_start, p_end) returns boolean`                      | solapamiento con citas activas                                                                                                     |
| `fn_is_out_of_schedule(p_employee, p_start, p_end) returns boolean`                              | fuera de `availability` o en `blocked_dates`                                                                                       |
| `create_appointment_safe(p_input jsonb) returns jsonb`                                           | crea cita validando conflicto + horario + bloqueos; `SLOT_TAKEN`/`OUT_OF_SCHEDULE`                                                 |
| `reschedule_appointment(p_id, p_start, p_end) returns jsonb`                                     | mueve cita con las mismas validaciones                                                                                             |
| `complete_appointment(p_appointment_id, p_method default 'cash', p_tip default 0) returns jsonb` | finaliza cita: `completed_at`, `actual_end_at`, genera `payments` + `commissions` con snapshot (45/55 configurable), transaccional |
| `cancel_appointment(p_id, p_reason) returns jsonb`                                               | cancela cita pendiente/confirmada                                                                                                  |
| `fn_exchange_rate(p_date date) returns numeric`                                                  | tasa del día desde `settings`                                                                                                      |

Reglas del snapshot de comisión (dentro de `complete_appointment`):

```sql
pct := coalesce(service.commission_pct, employee.commission_pct,
                (select (value->>'pct')::numeric from settings where key='default_commission_worker'));
employee_amount := round(base_amount * pct / 100, 2);
owner_amount    := round(base_amount - employee_amount, 2);
```

---

## 5. Views (reportes — `security_invoker = true`)

| View                | Contenido                                                   |
| ------------------- | ----------------------------------------------------------- |
| `v_daily_revenue`   | ingresos, propinas, gastos por día × método × moneda        |
| `v_monthly_revenue` | igual, por mes + comisiones worker/owner                    |
| `v_top_services`    | top por cantidad e ingreso en rango                         |
| `v_top_employees`   | citas, ingresos y comisión por trabajadora                  |
| `v_top_clients`     | visitas y gasto por cliente                                 |
| `v_cash_close`      | cierre de caja por día: ingresos − gastos por método/moneda |

---

## 6. RLS — resumen de políticas

Helpers: `fn_current_role()`, `fn_current_employee_id()` (`security definer`).

| Tabla                        | owner                                                            | worker                                   | receptionist                                   |
| ---------------------------- | ---------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| users                        | select all; update propio                                        | select/update propio                     | select/update propio                           |
| employees                    | all                                                              | select all (para agenda)                 | select all                                     |
| clients                      | all                                                              | select/update propios (los de sus citas) | all                                            |
| services                     | all                                                              | select                                   | select                                         |
| appointments                 | all                                                              | select/update propios                    | select all; insert; update (pending/confirmed) |
| appointment_services         | all                                                              | select propios                           | all                                            |
| payments                     | all; insert solo owner o worker de la cita (finalize)            | —                                        | —                                              |
| commissions                  | select all; insert solo al finalizar (owner o worker de la cita) | select propios                           | —                                              |
| expenses                     | all                                                              | —                                        | select                                         |
| availability / blocked_dates | all                                                              | select                                   | select                                         |
| settings                     | all                                                              | select (defaults)                        | select                                         |
| currencies                   | all                                                              | select                                   | select                                         |
| audit_logs                   | select                                                           | —                                        | —                                              |
| notifications                | all                                                              | select/update propios                    | select/update propios                          |

Regla de oro: lo que receptionist no debe ver **no existe para su JWT**.

---

## 7. Seeds (`supabase/seed.sql`)

- Usuarios de prueba: `owner@demo.ni`, `ana@demo.ni` (worker), `recep@demo.ni`
  (contraseña demo documentada solo para dev).
- 3 trabajadoras con colores y comisiones variadas (55, 60, null).
- 11 servicios del catálogo (corte mujer/hombre, tinte, mechas, manicure,
  pedicure, cejas, pestañas, peinado, botox capilar, keratina) con precios
  NIO/USD realistas y duraciones.
- 5 clientes sintéticos; citas de la semana con todos los estados.
- Settings completos (45/55, tasa 36.80, horario 8:00–19:00 Lun–Sáb).
- Disponibilidad y un `blocked_date` de ejemplo.

> Datos sintéticos siempre. Jamás datos reales de clientes en seeds.
