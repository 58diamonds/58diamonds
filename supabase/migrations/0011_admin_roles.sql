-- Admin roles. Owner: everything. Admin: everything, and manages admins and
-- editors (never owners). Editor: the website content and the collection only.
-- A blocked admin can no longer sign in. Email is optional.
alter table admins add column if not exists role text not null default 'editor';
alter table admins drop constraint if exists admins_role_check;
alter table admins add constraint admins_role_check check (role in ('owner', 'admin', 'editor'));
alter table admins add column if not exists blocked boolean not null default false;
alter table admins alter column email drop not null;

-- The two accounts that existed before roles.
update admins set role = 'owner' where username = 'farah';
update admins set role = 'admin' where username = 'sacha';

create or replace function admin_role() returns text
  language sql stable security definer set search_path = public as $$
    select role from admins where user_id = auth.uid() and not blocked;
  $$;

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (select 1 from admins where user_id = auth.uid() and not blocked);
  $$;

-- Owners and admins: orders, clients, requests, agenda, newsletter, booking.
create or replace function is_manager() returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (select 1 from admins where user_id = auth.uid() and not blocked and role in ('owner', 'admin'));
  $$;

-- Adding, blocking and changing admins goes through the server (which checks
-- who may touch whom), never straight from the browser.
drop policy if exists "admins write" on admins;

-- The Instagram token: owners and admins only (editors use the server routes).
drop policy if exists "app_settings admin" on app_settings;
create policy "app_settings admin" on app_settings for all using (is_manager()) with check (is_manager());

-- Editors may change the homepage and the Events/Press switches, nothing else
-- in settings (contact details, VAT, site visibility, ...).
create or replace function settings_editor_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
  declare
    allowed text[] := array['home_blocks', 'home_tiles', 'header_logo', 'hero_image_url', 'hero_fit', 'hero_focus', 'about_image_url', 'events_enabled', 'press_enabled', 'updated_at'];
  begin
    if auth.uid() is not null and not is_manager()
       and (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
      raise exception 'Only an owner or admin can change these settings.';
    end if;
    return new;
  end;
  $$;
drop trigger if exists settings_editor_guard on settings;
create trigger settings_editor_guard before update on settings for each row execute function settings_editor_guard();

drop policy if exists "customers own" on customers;
create policy "customers own" on customers for all
  using (user_id = auth.uid() or is_manager())
  with check (user_id = auth.uid() or is_manager());

drop policy if exists "orders own read" on orders;
create policy "orders own read" on orders for select using (customer_id = auth.uid() or is_manager());
drop policy if exists "orders admin update" on orders;
create policy "orders admin update" on orders for update using (is_manager()) with check (is_manager());
drop policy if exists "order_items own read" on order_items;
create policy "order_items own read" on order_items for select using (
  exists (select 1 from orders o where o.id = order_items.order_id and (o.customer_id = auth.uid() or is_manager()))
);
drop policy if exists "invoice_counters admin read" on invoice_counters;
create policy "invoice_counters admin read" on invoice_counters for select using (is_manager());

drop policy if exists "newsletter admin" on newsletter_subscribers;
create policy "newsletter admin" on newsletter_subscribers for all using (is_manager()) with check (is_manager());

drop policy if exists "requests admin all" on appointment_requests;
create policy "requests admin all" on appointment_requests for all using (is_manager()) with check (is_manager());

drop policy if exists "booking_settings admin" on booking_settings;
create policy "booking_settings admin" on booking_settings for all using (is_manager()) with check (is_manager());
