-- ============================================================================
-- CitaBella — Fotos de servicios realizados
-- Bucket privado + tabla de metadatos + RLS por rol.
-- ============================================================================

-- ============ BUCKET DE STORAGE ============
-- Privado: el acceso se controla con RLS en storage.objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'appointment-photos',
  'appointment-photos',
  false,
  5242880, -- 5 MB por foto
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ============ TABLA ============
create table appointment_photos (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  -- denormalizado: acelera el historial del cliente y simplifica RLS
  client_id uuid not null references clients (id) on delete cascade,
  employee_id uuid references employees (id) on delete set null,
  storage_path text not null unique,
  caption text check (char_length(caption) <= 300),
  uploaded_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_appointment_photos_path
    check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$')
);

comment on table appointment_photos is 'Fotos de servicios realizados, adjuntas a una cita y visibles en el historial del cliente.';
comment on column appointment_photos.storage_path is 'Ruta en el bucket appointment-photos: <appointment_id>/<uuid>.<ext>.';

create index idx_appointment_photos_appointment on appointment_photos (appointment_id, created_at);
create index idx_appointment_photos_client on appointment_photos (client_id, created_at desc);
create index idx_appointment_photos_uploaded_by on appointment_photos (uploaded_by);

-- ============ TRIGGERS ============
create trigger trg_appointment_photos_updated_at
  before update on appointment_photos
  for each row execute function fn_set_updated_at();

create trigger trg_appointment_photos_audit
  after update or delete on appointment_photos
  for each row execute function fn_audit_row();

-- ============ RLS: appointment_photos ============
alter table appointment_photos enable row level security;

-- Select: owner y recepcionista ven todas; trabajadora solo las de SUS citas.
create policy appointment_photos_select_owner on appointment_photos
  for select using (fn_current_role() = 'owner');

create policy appointment_photos_select_receptionist on appointment_photos
  for select using (fn_current_role() = 'receptionist');

create policy appointment_photos_select_worker on appointment_photos
  for select using (
    fn_current_role() = 'worker'
    and exists (
      select 1 from appointments a
      where a.id = appointment_photos.appointment_id
        and a.employee_id = fn_current_employee_id()
    )
  );

-- Insert: owner y la trabajadora asignada a la cita.
create policy appointment_photos_insert_owner on appointment_photos
  for insert with check (fn_current_role() = 'owner');

create policy appointment_photos_insert_worker on appointment_photos
  for insert with check (
    fn_current_role() = 'worker'
    and exists (
      select 1 from appointments a
      where a.id = appointment_photos.appointment_id
        and a.employee_id = fn_current_employee_id()
    )
  );

-- Update (solo caption): owner y la trabajadora asignada.
create policy appointment_photos_update_owner on appointment_photos
  for update using (fn_current_role() = 'owner')
  with check (fn_current_role() = 'owner');

create policy appointment_photos_update_worker on appointment_photos
  for update using (
    fn_current_role() = 'worker'
    and exists (
      select 1 from appointments a
      where a.id = appointment_photos.appointment_id
        and a.employee_id = fn_current_employee_id()
    )
  )
  with check (
    fn_current_role() = 'worker'
    and exists (
      select 1 from appointments a
      where a.id = appointment_photos.appointment_id
        and a.employee_id = fn_current_employee_id()
    )
  );

-- Delete: owner, quien subió la foto o la trabajadora asignada.
create policy appointment_photos_delete_owner on appointment_photos
  for delete using (fn_current_role() = 'owner');

create policy appointment_photos_delete_uploader on appointment_photos
  for delete using (uploaded_by = auth.uid());

create policy appointment_photos_delete_worker on appointment_photos
  for delete using (
    fn_current_role() = 'worker'
    and exists (
      select 1 from appointments a
      where a.id = appointment_photos.appointment_id
        and a.employee_id = fn_current_employee_id()
    )
  );

-- ============ RLS: storage.objects (bucket appointment-photos) ============
-- La ruta es <appointment_id>/<uuid>.<ext>; el primer segmento identifica la cita.

create policy appointment_photos_storage_select on storage.objects
  for select using (
    bucket_id = 'appointment-photos'
    and (
      fn_current_role() in ('owner', 'receptionist')
      or (
        fn_current_role() = 'worker'
        and exists (
          select 1 from appointments a
          where a.id::text = (storage.foldername(name))[1]
            and a.employee_id = fn_current_employee_id()
        )
      )
    )
  );

create policy appointment_photos_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'appointment-photos'
    and (
      fn_current_role() = 'owner'
      or (
        fn_current_role() = 'worker'
        and exists (
          select 1 from appointments a
          where a.id::text = (storage.foldername(name))[1]
            and a.employee_id = fn_current_employee_id()
        )
      )
    )
  );

create policy appointment_photos_storage_update on storage.objects
  for update using (
    bucket_id = 'appointment-photos'
    and (
      fn_current_role() = 'owner'
      or (
        fn_current_role() = 'worker'
        and exists (
          select 1 from appointments a
          where a.id::text = (storage.foldername(name))[1]
            and a.employee_id = fn_current_employee_id()
        )
      )
    )
  );

create policy appointment_photos_storage_delete on storage.objects
  for delete using (
    bucket_id = 'appointment-photos'
    and (
      fn_current_role() = 'owner'
      or (
        fn_current_role() = 'worker'
        and exists (
          select 1 from appointments a
          where a.id::text = (storage.foldername(name))[1]
            and a.employee_id = fn_current_employee_id()
        )
      )
    )
  );
