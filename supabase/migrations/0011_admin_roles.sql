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

drop policy if exists "admins write" on admins;
create policy "admins write" on admins for all using (is_manager()) with check (is_manager());

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
