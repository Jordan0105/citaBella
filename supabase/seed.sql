-- ============================================================================
-- CitaBella — Seeds de desarrollo (datos sintéticos, NUNCA datos reales)
-- Se ejecuta con `supabase db reset` tras aplicar las migraciones.
--
-- Usuarios demo (contraseña para todos: demo1234)
--   owner@demo.ni  → owner (dueña)
--   ana@demo.ni    → worker (Ana López, 55%)
--   betty@demo.ni  → worker (Betty Ruiz, 60%)
--   carla@demo.ni  → worker (Carla Méndez, default)
--   recep@demo.ni  → receptionist
-- ============================================================================

-- ============ USUARIOS AUTH (el trigger crea las filas en public.users) ============
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, phone, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  u.email,
  extensions.crypt('demo1234', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('full_name', u.full_name),
  '', '',
  '', '', '',
  '', '', null, ''
from (values
  ('owner@demo.ni', 'Elena Casco (Dueña)'),
  ('ana@demo.ni', 'Ana López'),
  ('betty@demo.ni', 'Betty Ruiz'),
  ('carla@demo.ni', 'Carla Méndez'),
  ('recep@demo.ni', 'Sofía Ramírez (Recepción)')
) as u(email, full_name)
on conflict do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  au.id,
  'email',
  'email',
  jsonb_build_object('sub', au.id::text, 'email', au.email, 'email_verified', true),
  now(), now(), now()
from auth.users au
where au.email in ('owner@demo.ni', 'ana@demo.ni', 'betty@demo.ni', 'carla@demo.ni', 'recep@demo.ni')
on conflict do nothing;

-- ============ ROLES ============
update users set role = 'owner' where email = 'owner@demo.ni';
update users set role = 'receptionist' where email = 'recep@demo.ni';

-- ============ TRABAJADORAS + vínculo con usuarios worker ============
with ins as (
  insert into employees (full_name, specialty, color, commission_pct, phone) values
    ('Ana López', 'Colorista', '#B7A6E3', 55.00, '+50584123456'),
    ('Betty Ruiz', 'Estilista', '#D96A8B', 60.00, '+50577123456'),
    ('Carla Méndez', 'Nail artist', '#9CC9A8', null, '+50588123456')
  returning id, full_name
)
update users u
set role = 'worker', employee_id = ins.id
from ins
where (ins.full_name = 'Ana López' and u.email = 'ana@demo.ni')
   or (ins.full_name = 'Betty Ruiz' and u.email = 'betty@demo.ni')
   or (ins.full_name = 'Carla Méndez' and u.email = 'carla@demo.ni');

-- Horario semanal: lunes a sábado, 08:00–17:00 (todas)
insert into availability (employee_id, weekday, start_time, end_time)
select e.id, d.wd, time '08:00', time '17:00'
from employees e
cross join (values (1), (2), (3), (4), (5), (6)) as d(wd);

-- Días bloqueados de ejemplo
insert into blocked_dates (employee_id, blocked_date, reason)
select id, current_date + 14, 'Vacaciones' from employees where full_name = 'Carla Méndez';

-- ============ SERVICIOS (catálogo) ============
insert into services (name, price_nio, price_usd, duration_minutes, commission_pct) values
  ('Corte mujer', 350.00, 9.50, 45, null),
  ('Corte hombre', 250.00, 7.00, 30, null),
  ('Tinte', 1200.00, 32.50, 120, null),
  ('Mechas', 1800.00, 49.00, 150, 60.00),
  ('Manicure', 400.00, 11.00, 60, null),
  ('Pedicure', 500.00, 13.50, 60, null),
  ('Cejas', 200.00, 5.50, 20, null),
  ('Pestañas', 600.00, 16.50, 60, null),
  ('Peinado', 700.00, 19.00, 60, null),
  ('Botox capilar', 1500.00, 41.00, 120, null),
  ('Keratina', 2200.00, 60.00, 180, null);

-- ============ CLIENTES (sintéticos) ============
insert into clients (full_name, phone, whatsapp, email, birth_date, notes) values
  ('María José Rivas', '+50584121111', '+50584121111', 'maria.demo@example.ni', date '1994-03-15', 'Prefiere color chocolate.'),
  ('Karla Espinoza', '+50577552222', '+50577552222', 'karla.demo@example.ni', date '1988-11-02', null),
  ('Gabriela Ortiz', '+50588123333', null, null, date '2000-06-30', 'Alérgica a acetona.'),
  ('Jessica Cano', '+50584445555', '+50584445555', 'jessica.demo@example.ni', null, null),
  ('Lucía Aguirre', '+50577889999', '+50577889999', 'lucia.demo@example.ni', date '1996-09-21', 'Cliente recurrente.');

-- ============ SETTINGS ============
insert into settings (key, value) values
  ('default_commission_owner', '{"pct": 45}'),
  ('default_commission_worker', '{"pct": 55}'),
  ('default_currency', '{"code": "NIO"}'),
  ('exchange_rate', '{"nio_per_usd": 36.80}'),
  ('salon_info', '{"name": "CitaBella Studio", "phone": "+50588887777", "address": "León, Nicaragua"}'),
  ('business_hours', '{"open": "08:00", "close": "19:00", "days": [1,2,3,4,5,6]}')
on conflict (key) do nothing;

-- ============ MONEDAS ============
insert into currencies (code, name, symbol, exchange_rate_to_nio) values
  ('NIO', 'Córdoba nicaragüense', 'C$', null),
  ('USD', 'Dólar estadounidense', '$', 36.80)
on conflict (code) do nothing;

-- ============ CITAS DE LA SEMANA ============
-- Pared horaria de Managua → timestamptz. Ej.: hoy 09:00
-- ((date_trunc('day', now() at time zone 'America/Managua') + interval '9 hours') at time zone 'America/Managua')

-- Hoy 09:00 · Ana · Corte mujer · confirmada
insert into appointments (
  client_id, employee_id, service_id, starts_at, ends_at, status,
  currency, price, discount, created_by
)
select
  c.id, e.id, s.id,
  (date_trunc('day', now() at time zone 'America/Managua') + interval '9 hours') at time zone 'America/Managua',
  (date_trunc('day', now() at time zone 'America/Managua') + interval '9 hours 45 minutes') at time zone 'America/Managua',
  'confirmed', 'NIO', 350.00, 0,
  (select id from users where email = 'owner@demo.ni')
from clients c, employees e, services s
where c.full_name = 'María José Rivas' and e.full_name = 'Ana López' and s.name = 'Corte mujer';

insert into appointment_services (appointment_id, service_id, price, discount, currency, duration_minutes)
select a.id, s.id, 350.00, 0, 'NIO', 45
from appointments a, services s
where a.notes is null and a.status = 'confirmed' and s.name = 'Corte mujer'
  and a.employee_id = (select id from employees where full_name = 'Ana López')
  and a.starts_at::date = (now() at time zone 'America/Managua')::date;

-- Hoy 10:00 · Betty · Manicure + Pedicure · en proceso
insert into appointments (
  client_id, employee_id, starts_at, ends_at, status, currency, price, discount, created_by
)
select
  c.id, e.id,
  (date_trunc('day', now() at time zone 'America/Managua') + interval '10 hours') at time zone 'America/Managua',
  (date_trunc('day', now() at time zone 'America/Managua') + interval '12 hours') at time zone 'America/Managua',
  'in_progress', 'NIO', 900.00, 0,
  (select id from users where email = 'recep@demo.ni')
from clients c, employees e
where c.full_name = 'Karla Espinoza' and e.full_name = 'Betty Ruiz';

insert into appointment_services (appointment_id, service_id, price, discount, currency, duration_minutes)
select a.id, s.id, s.price_nio, 0, 'NIO', s.duration_minutes
from appointments a, services s
where a.status = 'in_progress' and s.name in ('Manicure', 'Pedicure');

-- Hoy 14:00 · Carla · Pestañas · pendiente
insert into appointments (
  client_id, employee_id, service_id, starts_at, ends_at, status,
  currency, price, discount, created_by
)
select
  c.id, e.id, s.id,
  (date_trunc('day', now() at time zone 'America/Managua') + interval '14 hours') at time zone 'America/Managua',
  (date_trunc('day', now() at time zone 'America/Managua') + interval '15 hours') at time zone 'America/Managua',
  'pending', 'NIO', 600.00, 0,
  (select id from users where email = 'recep@demo.ni')
from clients c, employees e, services s
where c.full_name = 'Gabriela Ortiz' and e.full_name = 'Carla Méndez' and s.name = 'Pestañas';

insert into appointment_services (appointment_id, service_id, price, discount, currency, duration_minutes)
select a.id, s.id, 600.00, 0, 'NIO', 60
from appointments a, services s
where a.status = 'pending' and s.name = 'Pestañas';

-- Mañana 09:00 · Ana · Tinte · pendiente
insert into appointments (
  client_id, employee_id, service_id, starts_at, ends_at, status,
  currency, price, discount, created_by
)
select
  c.id, e.id, s.id,
  (date_trunc('day', now() at time zone 'America/Managua') + interval '1 day 9 hours') at time zone 'America/Managua',
  (date_trunc('day', now() at time zone 'America/Managua') + interval '1 day 11 hours') at time zone 'America/Managua',
  'pending', 'NIO', 1200.00, 0,
  (select id from users where email = 'recep@demo.ni')
from clients c, employees e, services s
where c.full_name = 'Jessica Cano' and e.full_name = 'Ana López' and s.name = 'Tinte';

insert into appointment_services (appointment_id, service_id, price, discount, currency, duration_minutes)
select a.id, s.id, 1200.00, 0, 'NIO', 120
from appointments a, services s
where a.status = 'pending' and s.name = 'Tinte';

-- ============ CITAS COMPLETADAS (con pagos + comisiones snapshot) ============

-- Ayer 11:00 · Ana · Corte mujer · completada · 350 NIO → 192.50 / 157.50
insert into appointments (
  client_id, employee_id, service_id, starts_at, ends_at, status,
  currency, price, discount, created_by, completed_at, actual_end_at
)
select
  c.id, e.id, s.id,
  (date_trunc('day', now() at time zone 'America/Managua') - interval '1 day' + interval '11 hours') at time zone 'America/Managua',
  (date_trunc('day', now() at time zone 'America/Managua') - interval '1 day' + interval '11 hours 45 minutes') at time zone 'America/Managua',
  'completed', 'NIO', 350.00, 0,
  (select id from users where email = 'recep@demo.ni'),
  (date_trunc('day', now() at time zone 'America/Managua') - interval '1 day' + interval '11 hours 45 minutes') at time zone 'America/Managua',
  (date_trunc('day', now() at time zone 'America/Managua') - interval '1 day' + interval '11 hours 45 minutes') at time zone 'America/Managua'
from clients c, employees e, services s
where c.full_name = 'Jessica Cano' and e.full_name = 'Ana López' and s.name = 'Corte mujer';

insert into appointment_services (appointment_id, service_id, price, discount, currency, duration_minutes)
select a.id, s.id, 350.00, 0, 'NIO', 45
from appointments a, services s
where a.status = 'completed' and a.currency = 'NIO' and s.name = 'Corte mujer'
  and a.employee_id = (select id from employees where full_name = 'Ana López');

insert into payments (appointment_id, amount, tip, currency, exchange_rate, method, paid_at, received_by)
select a.id, 350.00, 0, 'NIO', 1, 'cash',
  a.completed_at,
  (select id from users where email = 'owner@demo.ni')
from appointments a
where a.status = 'completed' and a.price = 350.00
  and a.employee_id = (select id from employees where full_name = 'Ana López');

insert into commissions (
  appointment_id, employee_id, service_id, base_amount, currency,
  exchange_rate, employee_pct, employee_amount, owner_pct, owner_amount, created_at
)
select a.id, a.employee_id, s.id, 350.00, 'NIO', 1, 55.00, 192.50, 45.00, 157.50,
  a.completed_at
from appointments a, services s
where a.status = 'completed' and a.price = 350.00 and s.name = 'Corte mujer'
  and a.employee_id = (select id from employees where full_name = 'Ana López');

-- Hace 2 días 15:00 · Betty · Mechas (override 60%) · completada · 1800 NIO → 1080 / 720
insert into appointments (
  client_id, employee_id, service_id, starts_at, ends_at, status,
  currency, price, discount, created_by, completed_at, actual_end_at
)
select
  c.id, e.id, s.id,
  (date_trunc('day', now() at time zone 'America/Managua') - interval '2 days 15 hours' + interval '2 days') at time zone 'America/Managua',
  (date_trunc('day', now() at time zone 'America/Managua') - interval '2 days 12 hours 30 minutes' + interval '2 days') at time zone 'America/Managua',
  'completed', 'NIO', 1800.00, 0,
  (select id from users where email = 'owner@demo.ni'),
  (date_trunc('day', now() at time zone 'America/Managua') - interval '2 days 12 hours 30 minutes' + interval '2 days') at time zone 'America/Managua',
  (date_trunc('day', now() at time zone 'America/Managua') - interval '2 days 12 hours 30 minutes' + interval '2 days') at time zone 'America/Managua'
from clients c, employees e, services s
where c.full_name = 'Lucía Aguirre' and e.full_name = 'Betty Ruiz' and s.name = 'Mechas';

insert into appointment_services (appointment_id, service_id, price, discount, currency, duration_minutes)
select a.id, s.id, 1800.00, 0, 'NIO', 150
from appointments a, services s
where a.status = 'completed' and a.price = 1800.00 and s.name = 'Mechas';

insert into payments (appointment_id, amount, tip, currency, exchange_rate, method, paid_at, received_by)
select a.id, 1800.00, 50.00, 'NIO', 1, 'card',
  a.completed_at,
  (select id from users where email = 'owner@demo.ni')
from appointments a
where a.status = 'completed' and a.price = 1800.00;

insert into commissions (
  appointment_id, employee_id, service_id, base_amount, currency,
  exchange_rate, employee_pct, employee_amount, owner_pct, owner_amount, created_at
)
select a.id, a.employee_id, s.id, 1800.00, 'NIO', 1, 60.00, 1080.00, 40.00, 720.00,
  a.completed_at
from appointments a, services s
where a.status = 'completed' and a.price = 1800.00 and s.name = 'Mechas';

-- ============ NOTIFICACIONES ============
insert into notifications (user_id, type, title, body)
select id, 'system', 'Bienvenida', 'Bienvenida a CitaBella. Tu salón está listo.'
from users where role = 'owner';
