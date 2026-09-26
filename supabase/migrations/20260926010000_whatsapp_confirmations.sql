-- whatsapp confirmations: guardar mensajes entrantes y acción tomada
alter table whatsapp_messages
  add column direction text not null default 'outbound'
    constraint chk_whatsapp_messages_direction
      check (direction in ('outbound', 'inbound')),
  add column action_taken text
    constraint chk_whatsapp_messages_action_taken
      check (action_taken in ('confirmed', 'cancelled', 'ignored'));

-- incluir 'received' para mensajes entrantes
alter table whatsapp_messages
  drop constraint if exists chk_whatsapp_messages_status,
  add constraint chk_whatsapp_messages_status
    check (status in ('pending', 'sent', 'delivered', 'read', 'failed', 'received'));

comment on column whatsapp_messages.direction is 'outbound = enviado por nosotros, inbound = recibido del cliente';
comment on column whatsapp_messages.action_taken is 'acción derivada de un mensaje entrante: confirmed/cancelled/ignored';

create index idx_whatsapp_messages_direction on whatsapp_messages (direction, action_taken);
create index idx_whatsapp_messages_provider_msg_direction on whatsapp_messages (provider_message_id, direction);

-- valores por defecto explícitos para inserts futuros
alter table whatsapp_messages
  alter column direction set default 'outbound';
