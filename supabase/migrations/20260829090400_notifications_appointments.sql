-- ============================================================================
-- CitaBella — Fase 5: notificaciones de recordatorio por cita
-- appointment_id permite deduplicar recordatorios del cron (índice único).
-- ============================================================================

alter table notifications
  add column appointment_id uuid references appointments (id) on delete cascade;

comment on column notifications.appointment_id is 'Cita asociada (recordatorios del cron); null = notificación general.';

create unique index if not exists uq_notifications_user_appointment_type
  on notifications (user_id, type, appointment_id);

-- El cron inserta por user de la dueña y de la trabajadora asignada
drop policy notifications_insert on notifications;
create policy notifications_insert on notifications
  for insert to authenticated
  with check (
    fn_current_role() = 'owner'
    or user_id = auth.uid()
  );
