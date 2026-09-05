-- ============================================================================
-- CitaBella — Fase 4: views de reportes a grano-día + comisiones diarias
-- Reemplaza las views mensuales de top-X por grano-día (los reportes de
-- rango arbitrario agregan días). security_invoker hereda RLS.
-- ============================================================================

-- Las views existentes usan columna "month": drop + recreate (renombrar
-- columnas de una view no está permitido con create or replace).
drop view if exists v_service_revenue, v_employee_revenue, v_client_revenue cascade;

-- Servicios vendidos por día
create or replace view v_service_revenue with (security_invoker = true) as
select
  (a.completed_at at time zone 'America/Managua')::date as day,
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

-- Rendimiento de trabajadoras por día (comisiones)
create or replace view v_employee_revenue with (security_invoker = true) as
select
  (c.created_at at time zone 'America/Managua')::date as day,
  e.id as employee_id,
  e.full_name as employee_name,
  count(distinct c.appointment_id) as appointments_qty,
  sum(c.base_amount) as revenue,
  sum(c.employee_amount) as commission,
  c.currency
from commissions c
join employees e on e.id = c.employee_id
group by 1, 2, 3, 7;

-- Gasto por cliente por día
create or replace view v_client_revenue with (security_invoker = true) as
select
  (p.paid_at at time zone 'America/Managua')::date as day,
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

-- Comisiones por día × trabajadora × moneda (para reportes semanales/diarios)
create or replace view v_daily_commissions with (security_invoker = true) as
select
  (c.created_at at time zone 'America/Managua')::date as day,
  e.id as employee_id,
  e.full_name as employee_name,
  c.currency,
  sum(c.employee_amount) as employee_amount,
  sum(c.owner_amount) as owner_amount,
  count(distinct c.appointment_id) as appointments_qty
from commissions c
join employees e on e.id = c.employee_id
group by 1, 2, 3, 4;
