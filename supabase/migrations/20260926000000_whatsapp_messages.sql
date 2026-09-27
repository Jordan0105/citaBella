-- ============================================================================
-- CitaBella — WhatsApp Business API
-- Registro de envíos y estados de mensajes de WhatsApp.
-- ============================================================================

-- ============ TABLA ============
create table whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references notifications (id) on delete set null,
  appointment_id uuid references appointments (id) on delete set null,
  client_id uuid references clients (id) on delete set null,
  phone text not null,
  provider text not null default 'mock',
  provider_message_id text,
  template_name text,
  body text,
  status text not null default 'pending'
    constraint chk_whatsapp_messages_status
      check (status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table whatsapp_messages is 'Log de mensajes WhatsApp enviados y sus estados de entrega.';
comment on column whatsapp_messages.status is 'pending | sent | delivered | read | failed';

-- ============ ÍNDICES ============
create index idx_whatsapp_messages_appointment on whatsapp_messages (appointment_id, created_at desc);
create index idx_whatsapp_messages_notification on whatsapp_messages (notification_id);
create index idx_whatsapp_messages_provider_msg on whatsapp_messages (provider_message_id);
create index idx_whatsapp_messages_status on whatsapp_messages (status, created_at desc);

-- ============ TRIGGER updated_at ============
create trigger trg_whatsapp_messages_updated_at
  before update on whatsapp_messages
  for each row execute function fn_set_updated_at();

-- ============ RLS ============
alter table whatsapp_messages enable row level security;

-- Select: owner todo; trabajadora solo los de sus citas; recepcionista todo.
create policy whatsapp_messages_select_owner on whatsapp_messages
  for select using (fn_current_role() = 'owner');

create policy whatsapp_messages_select_worker on whatsapp_messages
  for select using (
    fn_current_role() = 'worker'
    and exists (
      select 1 from appointments a
      where a.id = whatsapp_messages.appointment_id
        and a.employee_id = fn_current_employee_id()
    )
  );

create policy whatsapp_messages_select_receptionist on whatsapp_messages
  for select using (fn_current_role() = 'receptionist');

-- Insert: owner y trabajadora (solo sus citas). La recepcionista no envía mensajes.
create policy whatsapp_messages_insert_owner on whatsapp_messages
  for insert with check (fn_current_role() = 'owner');

create policy whatsapp_messages_insert_worker on whatsapp_messages
  for insert with check (
    fn_current_role() = 'worker'
    and exists (
      select 1 from appointments a
      where a.id = whatsapp_messages.appointment_id
        and a.employee_id = fn_current_employee_id()
    )
  );

-- Update/delete: solo owner. El webhook usa service role (bypass RLS).
create policy whatsapp_messages_update_owner on whatsapp_messages
  for update using (fn_current_role() = 'owner')
  with check (fn_current_role() = 'owner');

create policy whatsapp_messages_delete_owner on whatsapp_messages
  for delete using (fn_current_role() = 'owner');

-- ============ AUDITORÍA ============
create trigger trg_whatsapp_messages_audit
  after update or delete on whatsapp_messages
  for each row execute function fn_audit_row();
