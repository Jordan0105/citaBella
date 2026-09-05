-- ============================================================================
-- CitaBella — Fase 1: funciones SQL transaccionales + views de reportes
-- La lógica crítica (conflictos, finalización con pagos/comisiones) vive aquí,
-- NUNCA en JavaScript. Reglas: agents/finance.md y docs/business-rules.md
-- ============================================================================

-- ============ HELPERS DE CONFIGURACIÓN ============

create or replace function fn_setting(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select value from settings where key = p_key;
$$;

create or replace function fn_exchange_rate() returns numeric(12,4)
language sql stable security definer set search_path = public as $$
  select coalesce((fn_setting('exchange_rate') ->> 'nio_per_usd')::numeric(12,4), 36.80);
$$;

-- ============ AGENDA: CONFLICTOS Y HORARIOS ============

-- ¿Existe cita activa que se solape? (citas contiguas SÍ se permiten)
create or replace function fn_check_appointment_conflict(
  p_employee uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude uuid default null
) returns boolean
language sql stable as $$
  select exists (
    select 1 from appointments a
    where a.employee_id = p_employee
      and a.status in ('pending', 'confirmed', 'in_progress')
      and a.starts_at < p_end
      and a.ends_at > p_start
      and (p_exclude is null or a.id <> p_exclude)
  );
$$;

-- ¿Fuera de horario laboral o en día bloqueado?
-- Usa la disponibilidad de la trabajadora; si no tiene registrada, usa el
-- horario del salón (settings.business_hours = {open, close, days:[dow…]}).
create or replace function fn_is_out_of_schedule(
  p_employee uuid,
  p_start timestamptz,
  p_end timestamptz
) returns boolean
language plpgsql stable as $$
declare
  v_start_wall timestamp;
  v_end_wall timestamp;
  v_dow smallint;
  v_has_availability boolean;
  v_bh jsonb;
begin
  v_start_wall := p_start at time zone 'America/Managua';
  v_end_wall := p_end at time zone 'America/Managua';

  -- No se admiten citas cruzando medianoche
  if v_start_wall::date <> v_end_wall::date then
    return true;
  end if;

  v_dow := extract(dow from v_start_wall)::smallint;

  -- Días bloqueados (de la trabajadora o de todo el salón)
  if exists (
    select 1 from blocked_dates b
    where b.blocked_date between v_start_wall::date and v_end_wall::date
      and (b.employee_id = p_employee or b.employee_id is null)
  ) then
    return true;
  end if;

  select exists (
    select 1 from availability a
    where a.employee_id = p_employee and a.is_active
  ) into v_has_availability;

  if v_has_availability then
    return not exists (
      select 1 from availability a
      where a.employee_id = p_employee
        and a.is_active
        and a.weekday = v_dow
        and a.start_time <= v_start_wall::time
        and a.end_time >= v_end_wall::time
    );
  end if;

  -- Fallback: horario del salón
  v_bh := fn_setting('business_hours');
  if v_bh is null then
    return false;
  end if;

  return not (
    v_start_wall::time >= (v_bh ->> 'open')::time
    and v_end_wall::time <= (v_bh ->> 'close')::time
    and v_dow::int = any (
      select jsonb_array_elements_text(v_bh -> 'days')::int
    )
  );
end $$;

-- ============ CREAR CITA (atómica, con validaciones) ============
-- Errores (errcode/mensaje): UNAUTHORIZED, VALIDATION, NOT_FOUND,
-- SLOT_TAKEN, OUT_OF_SCHEDULE, APPOINTMENT_NO_SERVICES.
create or replace function create_appointment_safe(p_input jsonb)
returns jsonb
language plpgsql security invoker as $$
declare
  v_client uuid := (p_input ->> 'client_id')::uuid;
  v_employee uuid := (p_input ->> 'employee_id')::uuid;
  v_service_id uuid := nullif(p_input ->> 'service_id', '')::uuid;
  v_start timestamptz := (p_input ->> 'starts_at')::timestamptz;
  v_end timestamptz := (p_input ->> 'ends_at')::timestamptz;
  v_currency currency_code := coalesce((p_input ->> 'currency')::currency_code, 'NIO');
  v_price numeric(12,2) := coalesce((p_input ->> 'price')::numeric, 0);
  v_discount numeric(12,2) := coalesce((p_input ->> 'discount')::numeric, 0);
  v_exchange numeric(12,4) := (p_input ->> 'exchange_rate')::numeric;
  v_notes text := p_input ->> 'notes';
  v_services jsonb := coalesce(p_input -> 'services', '[]'::jsonb);
  v_appt appointments;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if v_client is null or v_employee is null or v_start is null or v_end is null then
    raise exception 'VALIDATION: faltan campos obligatorios' using errcode = '22023';
  end if;

  if v_end <= v_start then
    raise exception 'VALIDATION: la hora final debe ser mayor a la inicial' using errcode = '22023';
  end if;

  if v_discount < 0 or v_discount > v_price then
    raise exception 'VALIDATION: el descuento no puede superar el precio' using errcode = '22023';
  end if;

  if not exists (select 1 from employees e where e.id = v_employee and e.is_active) then
    raise exception 'NOT_FOUND: trabajadora no encontrada o inactiva' using errcode = 'P0002';
  end if;

  if not exists (select 1 from clients c where c.id = v_client and c.is_active) then
    raise exception 'NOT_FOUND: cliente no encontrado o inactivo' using errcode = 'P0002';
  end if;

  if v_currency = 'USD' and v_exchange is null then
    v_exchange := fn_exchange_rate();
  end if;

  if fn_check_appointment_conflict(v_employee, v_start, v_end, null) then
    raise exception 'SLOT_TAKEN: ya existe una cita para esta trabajadora en ese horario'
      using errcode = 'P0001';
  end if;

  if fn_is_out_of_schedule(v_employee, v_start, v_end) then
    raise exception 'OUT_OF_SCHEDULE: fuera del horario laboral o en día bloqueado'
      using errcode = 'P0001';
  end if;

  insert into appointments (
    client_id, employee_id, service_id, starts_at, ends_at, status,
    currency, price, discount, exchange_rate, notes, created_by
  ) values (
    v_client, v_employee, v_service_id, v_start, v_end, 'pending',
    v_currency, v_price, v_discount, v_exchange, v_notes, auth.uid()
  )
  returning * into v_appt;

  perform 1;
  insert into appointment_services (appointment_id, service_id, price, discount, currency, duration_minutes)
  select
    v_appt.id,
    (s ->> 'service_id')::uuid,
    (s ->> 'price')::numeric,
    coalesce((s ->> 'discount')::numeric, 0),
    v_currency,
    coalesce((s ->> 'duration_minutes')::int, 30)
  from jsonb_array_elements(v_services) as s;

  if not exists (
    select 1 from appointment_services aps where aps.appointment_id = v_appt.id
  ) then
    raise exception 'APPOINTMENT_NO_SERVICES: la cita requiere al menos un servicio'
      using errcode = '22023';
  end if;

  return jsonb_build_object(
    'appointment', to_jsonb(v_appt),
    'services', (
      select coalesce(jsonb_agg(to_jsonb(aps)), '[]'::jsonb)
      from appointment_services aps
      where aps.appointment_id = v_appt.id
    )
  );
end $$;

-- ============ REPROGRAMAR CITA ============
create or replace function reschedule_appointment(
  p_appointment_id uuid,
  p_start timestamptz,
  p_end timestamptz
) returns jsonb
language plpgsql security invoker as $$
declare
  v_appt appointments;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_appt from appointments where id = p_appointment_id for update;
  if not found then
    raise exception 'NOT_FOUND: cita no encontrada' using errcode = 'P0002';
  end if;

  if v_appt.status in ('completed', 'cancelled') then
    raise exception 'APPOINTMENT_TERMINAL: una cita % no puede reprogramarse', v_appt.status
      using errcode = 'P0001';
  end if;

  if p_end <= p_start then
    raise exception 'VALIDATION: la hora final debe ser mayor a la inicial' using errcode = '22023';
  end if;

  if fn_check_appointment_conflict(v_appt.employee_id, p_start, p_end, v_appt.id) then
    raise exception 'SLOT_TAKEN: ya existe una cita para esta trabajadora en ese horario'
      using errcode = 'P0001';
  end if;

  if fn_is_out_of_schedule(v_appt.employee_id, p_start, p_end) then
    raise exception 'OUT_OF_SCHEDULE: fuera del horario laboral o en día bloqueado'
      using errcode = 'P0001';
  end if;

  update appointments
  set starts_at = p_start, ends_at = p_end
  where id = v_appt.id
  returning * into v_appt;

  return to_jsonb(v_appt);
end $$;

-- ============ FINALIZAR CITA ("Cita realizada") ============
-- Genera en UNA transacción: estado completed + completed_at/actual_end_at +
-- payments + commissions con snapshot (agents/finance.md). Propina fuera de base.
-- Errores: UNAUTHORIZED, NOT_FOUND, APPOINTMENT_ALREADY_COMPLETED,
-- APPOINTMENT_CANCELLED, VALIDATION.
create or replace function complete_appointment(
  p_appointment_id uuid,
  p_method payment_method default 'cash',
  p_tip numeric default 0
) returns jsonb
language plpgsql security invoker as $$
declare
  v_appt appointments;
  v_employee employees;
  v_default_pct numeric(5,2);
  v_exchange numeric(12,4);
  v_total numeric(12,2) := 0;
  v_line record;
  v_base numeric(12,2);
  v_pct numeric(5,2);
  v_emp_amount numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_appt from appointments where id = p_appointment_id for update;
  if not found then
    raise exception 'NOT_FOUND: cita no encontrada' using errcode = 'P0002';
  end if;

  if v_appt.status = 'completed' then
    raise exception 'APPOINTMENT_ALREADY_COMPLETED' using errcode = 'P0001';
  end if;
  if v_appt.status = 'cancelled' then
    raise exception 'APPOINTMENT_CANCELLED' using errcode = 'P0001';
  end if;

  select * into v_employee from employees where id = v_appt.employee_id;
  v_default_pct := coalesce(
    (fn_setting('default_commission_worker') ->> 'pct')::numeric,
    55
  );

  if v_appt.currency = 'USD' then
    v_exchange := coalesce(v_appt.exchange_rate, fn_exchange_rate());
  else
    v_exchange := 1;
  end if;

  -- Comisión por línea de servicio:
  -- pct = service.commission_pct ?? employee.commission_pct ?? settings (55)
  for v_line in
    select aps.*, s.commission_pct as service_pct
    from appointment_services aps
    join services s on s.id = aps.service_id
    where aps.appointment_id = v_appt.id
  loop
    v_base := v_line.price - v_line.discount;
    v_pct := coalesce(v_line.service_pct, v_employee.commission_pct, v_default_pct);
    v_emp_amount := round(v_base * v_pct / 100, 2);

    insert into commissions (
      appointment_id, employee_id, service_id, base_amount, currency,
      exchange_rate, employee_pct, employee_amount, owner_pct, owner_amount
    ) values (
      v_appt.id, v_appt.employee_id, v_line.service_id, v_base, v_appt.currency,
      v_exchange, v_pct, v_emp_amount, 100 - v_pct, round(v_base - v_emp_amount, 2)
    );

    v_total := v_total + v_base;
  end loop;

  if v_total <= 0 then
    raise exception 'VALIDATION: la cita no tiene servicios con monto' using errcode = '22023';
  end if;

  update appointments
  set status = 'completed', completed_at = now(), actual_end_at = now()
  where id = v_appt.id
  returning * into v_appt;

  insert into payments (appointment_id, amount, tip, currency, exchange_rate, method, received_by)
  values (v_appt.id, v_total, p_tip, v_appt.currency, v_exchange, p_method, auth.uid());

  return jsonb_build_object(
    'appointment_id', v_appt.id,
    'amount', v_total,
    'tip', p_tip,
    'currency', v_appt.currency,
    'exchange_rate', v_exchange,
    'method', p_method,
    'completed_at', v_appt.completed_at
  );
end $$;

-- ============ CANCELAR CITA ============
create or replace function cancel_appointment(
  p_appointment_id uuid,
  p_reason text default null
) returns jsonb
language plpgsql security invoker as $$
declare
  v_appt appointments;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_appt from appointments where id = p_appointment_id for update;
  if not found then
    raise exception 'NOT_FOUND: cita no encontrada' using errcode = 'P0002';
  end if;

  if v_appt.status not in ('pending', 'confirmed') then
    raise exception 'APPOINTMENT_NOT_CANCELLABLE: una cita en estado % no puede cancelarse', v_appt.status
      using errcode = 'P0001';
  end if;

  update appointments
  set status = 'cancelled',
      notes = case
        when p_reason is not null and p_reason <> ''
          then coalesce(notes || E'\n', '') || 'Cancelada: ' || p_reason
        else notes
      end
  where id = v_appt.id
  returning * into v_appt;

  return to_jsonb(v_appt);
end $$;

-- ============ VIEWS DE REPORTES (security_invoker: heredan RLS) ============

-- Ingresos y propinas por día × moneda
create or replace view v_daily_revenue with (security_invoker = true) as
select
  (paid_at at time zone 'America/Managua')::date as day,
  currency,
  sum(amount) as income,
  sum(tip) as tips
from payments
group by 1, 2;

-- Cierre de caja: día × método × moneda (ingresos, propinas, gastos)
create or replace view v_cash_close with (security_invoker = true) as
select
  day,
  method,
  currency,
  sum(income) as income,
  sum(tips) as tips,
  sum(expenses) as expenses
from (
  select
    (paid_at at time zone 'America/Managua')::date as day,
    method,
    currency,
    amount as income,
    tip as tips,
    0::numeric(12,2) as expenses
  from payments
  union all
  select
    (spent_at at time zone 'America/Managua')::date,
    method,
    currency,
    0::numeric(12,2),
    0::numeric(12,2),
    amount
  from expenses
) movs
group by 1, 2, 3;

-- Resumen mensual: ingresos, propinas, gastos, comisiones (por moneda)
create or replace view v_monthly_revenue with (security_invoker = true) as
select
  month,
  currency,
  sum(income) as income,
  sum(tips) as tips,
  sum(expenses) as expenses,
  sum(commissions_worker) as commissions_worker,
  sum(commissions_owner) as commissions_owner
from (
  select
    date_trunc('month', (paid_at at time zone 'America/Managua')::date) as month,
    currency,
    amount as income,
    tip as tips,
    0::numeric(12,2) as expenses,
    0::numeric(12,2) as commissions_worker,
    0::numeric(12,2) as commissions_owner
  from payments
  union all
  select
    date_trunc('month', (spent_at at time zone 'America/Managua')::date),
    currency,
    0::numeric(12,2),
    0::numeric(12,2),
    amount,
    0::numeric(12,2),
    0::numeric(12,2)
  from expenses
  union all
  select
    date_trunc('month', (created_at at time zone 'America/Managua')::date),
    currency,
    0::numeric(12,2),
    0::numeric(12,2),
    0::numeric(12,2),
    employee_amount,
    owner_amount
  from commissions
) movs
group by 1, 2;

-- Servicios vendidos por mes (top services)
create or replace view v_service_revenue with (security_invoker = true) as
select
  date_trunc('month', (a.completed_at at time zone 'America/Managua')::date) as month,
  s.id as service_id,
  s.name as service_name,
  count(*) as qty,
  sum(aps.price - aps.discount) as revenue,
  aps.currency
from appointment_services aps
join appointments a on a.id = aps.appointment_id
join services s on s.id = aps.service_id
where a.status = 'completed'
group by 1, 2, 3, 6;

-- Rendimiento de trabajadoras por mes (comisiones)
create or replace view v_employee_revenue with (security_invoker = true) as
select
  date_trunc('month', (c.created_at at time zone 'America/Managua')::date) as month,
  e.id as employee_id,
  e.full_name as employee_name,
  count(distinct c.appointment_id) as appointments_qty,
  sum(c.base_amount) as revenue,
  sum(c.employee_amount) as commission,
  c.currency
from commissions c
join employees e on e.id = c.employee_id
group by 1, 2, 3, 7;

-- Gasto por cliente por mes
create or replace view v_client_revenue with (security_invoker = true) as
select
  date_trunc('month', (p.paid_at at time zone 'America/Managua')::date) as month,
  cl.id as client_id,
  cl.full_name as client_name,
  count(distinct p.appointment_id) as visits,
  sum(p.amount) as spent,
  p.currency
from payments p
join appointments a on a.id = p.appointment_id
join clients cl on cl.id = a.client_id
where a.status = 'completed'
group by 1, 2, 3, 6;
