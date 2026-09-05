-- ============================================================================
-- CitaBella — Fase 1: Row Level Security
-- La seguridad vive en la base de datos. Matriz completa: docs/permissions.md
-- Reglas clave:
--   receptionist JAMÁS ve payments/commissions (select no existe para su JWT)
--   worker solo ve sus filas (por employee_id)
-- ============================================================================

-- ============ HELPERS (fuente única del rol) ============

create or replace function fn_current_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid();
$$;

create or replace function fn_current_employee_id() returns uuid
language sql stable security definer set search_path = public as $$
  select employee_id from users where id = auth.uid();
$$;

-- ============ USERS ============
alter table users enable row level security;

create policy users_select on users
  for select to authenticated
  using (id = auth.uid() or fn_current_role() = 'owner');

create policy users_update on users
  for update to authenticated
  using (id = auth.uid() or fn_current_role() = 'owner')
  with check (id = auth.uid() or fn_current_role() = 'owner');

create policy users_insert on users
  for insert to authenticated
  with check (fn_current_role() = 'owner');

-- ============ EMPLOYEES ============
alter table employees enable row level security;

create policy employees_select on employees
  for select to authenticated
  using (true);

create policy employees_insert on employees
  for insert to authenticated
  with check (fn_current_role() = 'owner');

create policy employees_update on employees
  for update to authenticated
  using (fn_current_role() = 'owner')
  with check (fn_current_role() = 'owner');

create policy employees_delete on employees
  for delete to authenticated
  using (fn_current_role() = 'owner');

-- ============ CLIENTS ============
alter table clients enable row level security;

create policy clients_select on clients
  for select to authenticated
  using (
    fn_current_role() in ('owner', 'receptionist')
    or (
      fn_current_role() = 'worker'
      and exists (
        select 1 from appointments a
        where a.client_id = clients.id
          and a.employee_id = fn_current_employee_id()
      )
    )
  );

create policy clients_insert on clients
  for insert to authenticated
  with check (fn_current_role() in ('owner', 'receptionist'));

create policy clients_update on clients
  for update to authenticated
  using (fn_current_role() in ('owner', 'receptionist'))
  with check (fn_current_role() in ('owner', 'receptionist'));

create policy clients_delete on clients
  for delete to authenticated
  using (fn_current_role() = 'owner');

-- ============ SERVICES ============
alter table services enable row level security;

create policy services_select on services
  for select to authenticated
  using (true);

create policy services_insert on services
  for insert to authenticated
  with check (fn_current_role() = 'owner');

create policy services_update on services
  for update to authenticated
  using (fn_current_role() = 'owner')
  with check (fn_current_role() = 'owner');

create policy services_delete on services
  for delete to authenticated
  using (fn_current_role() = 'owner');

-- ============ APPOINTMENTS ============
alter table appointments enable row level security;

create policy appointments_select on appointments
  for select to authenticated
  using (
    fn_current_role() in ('owner', 'receptionist')
    or (
      fn_current_role() = 'worker'
      and employee_id = fn_current_employee_id()
    )
  );

create policy appointments_insert on appointments
  for insert to authenticated
  with check (fn_current_role() in ('owner', 'receptionist'));

create policy appointments_update on appointments
  for update to authenticated
  using (
    fn_current_role() = 'owner'
    or (fn_current_role() = 'worker' and employee_id = fn_current_employee_id())
    or (fn_current_role() = 'receptionist' and status in ('pending', 'confirmed'))
  )
  with check (
    fn_current_role() = 'owner'
    or (fn_current_role() = 'worker' and employee_id = fn_current_employee_id())
    or (fn_current_role() = 'receptionist' and status in ('pending', 'confirmed'))
  );

-- Sin delete: las citas se cancelan por cambio de estado.

-- ============ APPOINTMENT_SERVICES ============
alter table appointment_services enable row level security;

create policy appointment_services_select on appointment_services
  for select to authenticated
  using (
    fn_current_role() in ('owner', 'receptionist')
    or (
      fn_current_role() = 'worker'
      and exists (
        select 1 from appointments a
        where a.id = appointment_services.appointment_id
          and a.employee_id = fn_current_employee_id()
      )
    )
  );

create policy appointment_services_insert on appointment_services
  for insert to authenticated
  with check (fn_current_role() in ('owner', 'receptionist'));

create policy appointment_services_update on appointment_services
  for update to authenticated
  using (fn_current_role() = 'owner')
  with check (fn_current_role() = 'owner');

create policy appointment_services_delete on appointment_services
  for delete to authenticated
  using (fn_current_role() = 'owner');

-- ============ PAYMENTS (owner only; sin update/delete por diseño) ============
alter table payments enable row level security;

create policy payments_select on payments
  for select to authenticated
  using (fn_current_role() = 'owner');

create policy payments_insert on payments
  for insert to authenticated
  with check (
    fn_current_role() = 'owner'
    or (
      fn_current_role() = 'worker'
      and exists (
        select 1 from appointments a
        where a.id = payments.appointment_id
          and a.employee_id = fn_current_employee_id()
      )
    )
  );

-- ============ COMMISSIONS (solo lectura; inserciones solo al finalizar:
-- owner, o worker dueño de la cita. Sin update/delete por diseño) ============
alter table commissions enable row level security;

create policy commissions_select on commissions
  for select to authenticated
  using (
    fn_current_role() = 'owner'
    or (fn_current_role() = 'worker' and employee_id = fn_current_employee_id())
  );

create policy commissions_insert on commissions
  for insert to authenticated
  with check (
    fn_current_role() = 'owner'
    or (
      fn_current_role() = 'worker'
      and exists (
        select 1 from appointments a
        where a.id = commissions.appointment_id
          and a.employee_id = fn_current_employee_id()
      )
    )
  );

-- ============ EXPENSES ============
alter table expenses enable row level security;

create policy expenses_select on expenses
  for select to authenticated
  using (fn_current_role() in ('owner', 'receptionist'));

create policy expenses_insert on expenses
  for insert to authenticated
  with check (fn_current_role() = 'owner');

create policy expenses_update on expenses
  for update to authenticated
  using (fn_current_role() = 'owner')
  with check (fn_current_role() = 'owner');

create policy expenses_delete on expenses
  for delete to authenticated
  using (fn_current_role() = 'owner');

-- ============ AVAILABILITY ============
alter table availability enable row level security;

create policy availability_select on availability
  for select to authenticated
  using (true);

create policy availability_write on availability
  for all to authenticated
  using (fn_current_role() = 'owner')
  with check (fn_current_role() = 'owner');

-- ============ BLOCKED_DATES ============
alter table blocked_dates enable row level security;

create policy blocked_dates_select on blocked_dates
  for select to authenticated
  using (true);

create policy blocked_dates_write on blocked_dates
  for all to authenticated
  using (fn_current_role() = 'owner')
  with check (fn_current_role() = 'owner');

-- ============ SETTINGS ============
alter table settings enable row level security;

create policy settings_select on settings
  for select to authenticated
  using (true);

create policy settings_insert on settings
  for insert to authenticated
  with check (fn_current_role() = 'owner');

create policy settings_update on settings
  for update to authenticated
  using (fn_current_role() = 'owner')
  with check (fn_current_role() = 'owner');

-- ============ CURRENCIES ============
alter table currencies enable row level security;

create policy currencies_select on currencies
  for select to authenticated
  using (true);

create policy currencies_write on currencies
  for all to authenticated
  using (fn_current_role() = 'owner')
  with check (fn_current_role() = 'owner');

-- ============ AUDIT_LOGS (solo lectura para owner; escritura vía fn_audit_row) ============
alter table audit_logs enable row level security;

create policy audit_logs_select on audit_logs
  for select to authenticated
  using (fn_current_role() = 'owner');

-- ============ NOTIFICATIONS ============
alter table notifications enable row level security;

create policy notifications_select on notifications
  for select to authenticated
  using (user_id = auth.uid() or fn_current_role() = 'owner');

create policy notifications_update on notifications
  for update to authenticated
  using (user_id = auth.uid() or fn_current_role() = 'owner')
  with check (user_id = auth.uid() or fn_current_role() = 'owner');

create policy notifications_insert on notifications
  for insert to authenticated
  with check (fn_current_role() = 'owner');
