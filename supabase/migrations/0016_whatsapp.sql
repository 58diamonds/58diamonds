-- Automatic WhatsApp messages next to the emails (lib/whatsapp.ts).
-- Which messages are on, set in Admin > Settings: keys booking_received,
-- booking_confirmed, booking_declined, order_confirmed, order_shipped.
-- Only owners and admins can change it (settings_editor_guard).
alter table settings add column if not exists whatsapp_messages jsonb not null default '{}'::jsonb;
-- The client ticked "Send me updates on WhatsApp" on the form or at checkout.
alter table appointment_requests add column if not exists whatsapp_ok boolean not null default false;
alter table orders add column if not exists whatsapp_ok boolean not null default false;
