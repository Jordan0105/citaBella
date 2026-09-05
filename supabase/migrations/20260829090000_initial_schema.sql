-- ============================================================================
-- CitaBella — Fase 1: esquema inicial
-- Enums, tablas, índices y triggers base (updated_at, auditoría, inmutabilidad)
-- Ver docs/database-schema.md para el modelo canónico.
-- ============================================================================

-- ============ EXTENSIONES ============
create extension if not exists pgcrypto with schema extensions;

-- ============ ENUMS ============
create type user_role as enum ('owner', 'worker', 'receptionist');

create type appointment_status as enum (
  'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
);

create type payment_method as enum ('cash', 'transfer', 'card');

create type currency_code as enum ('NIO', 'USD');

create type expense_category as enum (
  'supplies', 'rent', 'utilities', 'salary_advance', 'marketing', 'other'
);

-- ============ EMPLOYEES (sin user_id: FK circular se resuelve abajo) ============
create table employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  specialty text,
  color text not null default '#B7A6E3',
  commission_pct numeric(5,2) check (commission_pct is null or commission_pct between 0 and 100),
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table employees is 'Trabajadoras del salón. commission_pct = % de la trabajadora (la dueña recibe el complemento).';

-- ============ USERS ============
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'receptionist',
  employee_id uuid references employees (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table employees
  add column user_id uuid references users (id);

comment on column users.employee_id is 'Solo para role = worker: vínculo con su perfil de trabajadora.';

-- ============ CLIENTS ============
create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  whatsapp text,
  email text,
  birth_date date check (birth_date < current_date),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ SERVICES ============
create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_nio numeric(12,2) not null check (price_nio >= 0),
  price_usd numeric(12,2) not null check (price_usd >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  commission_pct numeric(5,2) check (commission_pct is null or commission_pct between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ APPOINTMENTS ============
create table appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id),
  employee_id uuid not null references employees (id),
  service_id uuid references services (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  actual_end_at timestamptz,
  status appointment_status not null default 'pending',
  currency currency_code not null default 'NIO',
  price numeric(12,2) not null check (price >= 0),
  discount numeric(12,2) not null default 0 check (discount between 0 and price),
  exchange_rate numeric(12,4),
  notes text,
  created_by uuid references users (id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column appointments.exchange_rate is 'Snapshot NIO por USD al crear la cita (null si NIO).';

-- ============ APPOINTMENT_SERVICES ============
create table appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  service_id uuid not null references services (id),
  price numeric(12,2) not null check (price >= 0),
  discount numeric(12,2) not null default 0 check (discount between 0 and price),
  currency currency_code not null,
  duration_minutes integer not null
);

-- ============ PAYMENTS (inmutable) ============
create table payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments (id),
  amount numeric(12,2) not null check (amount >= 0),
  tip numeric(12,2) not null default 0 check (tip >= 0),
  currency currency_code not null,
  exchange_rate numeric(12,4) not null,
  method payment_method not null,
  paid_at timestamptz not null default now(),
  received_by uuid references users (id),
  notes text,
  created_at timestamptz not null default now()
);

comment on table payments is 'Ingresos de caja. Inmutable: correcciones solo con movimientos de ajuste (docs/business-rules.md).';

-- ============ COMMISSIONS (inmutable, snapshot) ============
create table commissions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id),
  employee_id uuid not null references employees (id),
  service_id uuid references services (id),
  base_amount numeric(12,2) not null check (base_amount >= 0),
  currency currency_code not null,
  exchange_rate numeric(12,4) not null,
  employee_pct numeric(5,2) not null check (employee_pct between 0 and 100),
  employee_amount numeric(12,2) not null check (employee_amount >= 0),
  owner_pct numeric(5,2) not null check (owner_pct between 0 and 100),
  owner_amount numeric(12,2) not null check (owner_amount >= 0),
  created_at timestamptz not null default now(),

  constraint chk_commissions_balance
    check (abs(employee_amount + owner_amount - base_amount) <= 0.01)
);

comment on table commissions is 'Snapshot inmutable de comisiones al finalizar la cita (agents/finance.md).';

-- ============ EXPENSES ============
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

-- ============ AVAILABILITY ============
create table availability (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  is_active boolean not null default true,

  constraint uq_availability_employee_weekday unique (employee_id, weekday)
);

comment on column availability.weekday is 'Día de la semana estilo Postgres dow: 0 = domingo … 6 = sábado.';

-- ============ BLOCKED_DATES ============
create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees (id) on delete cascade,
  blocked_date date not null,
  reason text,
  created_by uuid references users (id),
  created_at timestamptz not null default now(),

  constraint uq_blocked_dates_employee_day unique (employee_id, blocked_date)
);

comment on column blocked_dates.employee_id is 'null = bloqueo para todo el salón.';

-- ============ SETTINGS ============
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ============ CURRENCIES ============
create table currencies (
  code text primary key,
  name text not null,
  symbol text not null,
  exchange_rate_to_nio numeric(12,4),
  updated_at timestamptz not null default now()
);

-- ============ AUDIT_LOGS (solo insert) ============
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor uuid references users (id),
  table_name text not null,
  record_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- ============ NOTIFICATIONS ============
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ ÍNDICES ============
create index idx_users_email on users (email);
create index idx_employees_active on employees (is_active);
create index idx_clients_phone on clients (phone);
create index idx_clients_active on clients (is_active);
create index idx_services_active on services (is_active);
create index idx_appointments_starts_at on appointments (starts_at);
create index idx_appointments_employee_starts on appointments (employee_id, starts_at);
create index idx_appointments_status on appointments (status);
create index idx_appointments_client on appointments (client_id);
create index idx_appointment_services_appointment on appointment_services (appointment_id);
create index idx_payments_paid_at on payments (paid_at);
create index idx_payments_appointment on payments (appointment_id);
create index idx_commissions_created_at on commissions (created_at);
create index idx_commissions_employee on commissions (employee_id, created_at);
create index idx_expenses_spent_at on expenses (spent_at);
create index idx_blocked_dates_date on blocked_dates (blocked_date);
create index idx_notifications_user on notifications (user_id, created_at desc);
create index idx_audit_logs_table_record on audit_logs (table_name, record_id);

-- ============ FUNCIONES DE TRIGGERS ============

-- updated_at genérico
create or replace function fn_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- auditoría: escribe en audit_logs el old_data/new_data con el actor del JWT
create or replace function fn_audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
begin
  insert into audit_logs (actor, table_name, record_id, action, old_data, new_data)
  values (
    v_actor,
    tg_table_name,
    (case when tg_op = 'DELETE'
      then (to_jsonb(old) ->> 'id')::uuid
      else (to_jsonb(new) ->> 'id')::uuid end),
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

-- inmutabilidad de registros financieros/auditoría
create or replace function fn_block_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'IMMUTABLE_RECORD: las filas de % no pueden modificarse ni eliminarse', tg_table_name
    using errcode = 'P0001';
end $$;

-- citas terminales (completed/cancelled) no admiten más cambios
create or replace function fn_appointments_guard() returns trigger
language plpgsql as $$
begin
  if old.status in ('completed', 'cancelled') then
    raise exception 'APPOINTMENT_TERMINAL: una cita % no puede modificarse', old.status
      using errcode = 'P0001';
  end if;
  return new;
end $$;

-- alta en public.users al crear usuario de auth
create or replace function fn_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'receptionist'
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ============ TRIGGERS ============

create trigger trg_users_updated_at
  before update on users
  for each row execute function fn_set_updated_at();

create trigger trg_employees_updated_at
  before update on employees
  for each row execute function fn_set_updated_at();

create trigger trg_clients_updated_at
  before update on clients
  for each row execute function fn_set_updated_at();

create trigger trg_services_updated_at
  before update on services
  for each row execute function fn_set_updated_at();

create trigger trg_appointments_updated_at
  before update on appointments
  for each row execute function fn_set_updated_at();

create trigger trg_expenses_updated_at
  before update on expenses
  for each row execute function fn_set_updated_at();

create trigger trg_currencies_updated_at
  before update on currencies
  for each row execute function fn_set_updated_at();

create trigger trg_notifications_updated_at
  before update on notifications
  for each row execute function fn_set_updated_at();

create trigger trg_settings_updated_at
  before update on settings
  for each row execute function fn_set_updated_at();

-- auditoría (docs/business-rules.md §Auditoría)
create trigger trg_users_audit
  after update or delete on users
  for each row execute function fn_audit_row();

create trigger trg_employees_audit
  after update or delete on employees
  for each row execute function fn_audit_row();

create trigger trg_services_audit
  after update or delete on services
  for each row execute function fn_audit_row();

create trigger trg_settings_audit
  after update or delete on settings
  for each row execute function fn_audit_row();

-- inmutabilidad
create trigger trg_payments_immutable
  before update or delete on payments
  for each row execute function fn_block_mutation();

create trigger trg_commissions_immutable
  before update or delete on commissions
  for each row execute function fn_block_mutation();

create trigger trg_audit_logs_immutable
  before update or delete on audit_logs
  for each row execute function fn_block_mutation();

-- guard de transiciones de citas
create trigger trg_appointments_guard
  before update on appointments
  for each row execute function fn_appointments_guard();

-- alta automática en public.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function fn_handle_new_user();
