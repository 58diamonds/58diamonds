-- 58 Diamonds: schema.
--
-- Everything the client edits lives here, so the site never needs a developer
-- to change content. Every visitor-facing text is stored in the three site
-- languages as jsonb: {"en": "...", "nl": "...", "fr": "..."}.
--
-- The public (anon) key can read what is published and send an appointment
-- request. Customers read their own orders. Every other write goes through
-- is_admin().

-- Admins ------------------------------------------------------------------

-- A Supabase Auth user becomes an admin by having a row here. Admins sign in
-- with a username; the login page looks the email up by username server-side.
create table if not exists admins (
  user_id    uuid        primary key,
  username   text        not null unique check (username ~ '^[a-z0-9._-]{3,40}$'),
  email      text        not null,
  created_at timestamptz not null default now()
);

-- Signed in with username and password, and listed here.
create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (select 1 from admins where user_id = auth.uid());
  $$;

alter table admins enable row level security;
drop policy if exists "admins read" on admins;
create policy "admins read" on admins for select using (is_admin());
drop policy if exists "admins write" on admins;
create policy "admins write" on admins for all using (is_admin()) with check (is_admin());

-- Settings ----------------------------------------------------------------

-- One row (id = 1): contact details, switches and other non-text settings.
create table if not exists settings (
  id                 integer     primary key default 1 check (id = 1),
  whatsapp_number    text,
  phone              text,
  email              text,
  address            text,
  instagram_handle   text        not null default '58diamondsbyfarah',
  currency           text        not null default 'EUR',
  shop_enabled       boolean     not null default false,
  press_enabled      boolean     not null default false,
  events_enabled     boolean     not null default true,
  shipping_flat      numeric(12, 2) not null default 0,
  free_shipping_from numeric(12, 2),
  gift_wrap_enabled  boolean     not null default true,
  gift_wrap_price    numeric(12, 2) not null default 0,
  wishlist_enabled   boolean     not null default true,
  newsletter_enabled boolean     not null default true,
  -- Seller details printed on invoices.
  company_name       text,
  company_address    text,
  vat_number         text,
  vat_rate           numeric(5, 2) not null default 21,
  invoice_footer     text,
  ship_to            text[]      not null default array['BE','NL','LU','FR','DE'],
  hero_image_url     text,
  about_image_url    text,
  og_image_url       text,
  -- Homepage blocks in the order they appear; leaving one out hides it.
  home_blocks        text[]      not null default array['tiles','house','story','events','instagram','newsletter','contact'],
  -- The squares under the homepage photo: [{"image_url": "...", "section_id": "..."}].
  home_tiles         jsonb       not null default '[]'::jsonb,
  -- Colour of the logo in the header.
  header_logo        text        not null default 'ink' check (header_logo in ('ink', 'black', 'brown-gold')),
  updated_at         timestamptz not null default now()
);
insert into settings (id) values (1) on conflict (id) do nothing;

alter table settings enable row level security;
drop policy if exists "settings public read" on settings;
create policy "settings public read" on settings for select using (true);
drop policy if exists "settings admin update" on settings;
create policy "settings admin update" on settings for update using (is_admin()) with check (is_admin());

-- Every text on the site that is not content (buttons, headings, labels,
-- homepage copy, emails). Keyed, grouped for the admin, in three languages.
create table if not exists site_texts (
  key         text        primary key,
  value       jsonb       not null default '{}'::jsonb,
  grp         text        not null default 'General',
  label       text        not null default '',
  multiline   boolean     not null default false,
  position    integer     not null default 0,
  updated_at  timestamptz not null default now()
);
alter table site_texts enable row level security;
drop policy if exists "texts public read" on site_texts;
create policy "texts public read" on site_texts for select using (true);
drop policy if exists "texts admin write" on site_texts;
create policy "texts admin write" on site_texts for all using (is_admin()) with check (is_admin());

-- Pages and menu ----------------------------------------------------------

-- Free pages the client creates herself (About, Bespoke, Care guide...).
-- `body` holds the text per language (simple Markdown).
create table if not exists pages (
  id               uuid        primary key default gen_random_uuid(),
  slug             text        not null unique check (slug ~ '^[a-z0-9-]+$'),
  title            jsonb       not null default '{}'::jsonb,
  body             jsonb       not null default '{}'::jsonb,
  image_url        text,
  seo_title        jsonb       not null default '{}'::jsonb,
  seo_description  jsonb       not null default '{}'::jsonb,
  published        boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table pages enable row level security;
drop policy if exists "pages public read" on pages;
create policy "pages public read" on pages for select using (published or is_admin());
drop policy if exists "pages admin write" on pages;
create policy "pages admin write" on pages for all using (is_admin()) with check (is_admin());

-- The menus. `kind` says what an item opens:
--   builtin  one of the site's own pages: home, shop, events, press, contact, account
--   page     one of the client's pages
--   section  one section of the shop (Rings, Necklaces...)
--   link     any address (Instagram, a press article...)
-- Builtin shop/press/events items also follow their switch in settings, and
-- press only shows once an article is published.
create table if not exists menu_items (
  id         uuid        primary key default gen_random_uuid(),
  menu       text        not null default 'header' check (menu in ('header', 'footer')),
  kind       text        not null check (kind in ('builtin', 'page', 'section', 'link')),
  target     text,
  page_id    uuid        references pages (id) on delete cascade,
  section_id uuid,
  url        text,
  label      jsonb       not null default '{}'::jsonb,
  position   integer     not null default 0,
  visible    boolean     not null default true,
  check (
    (kind = 'builtin' and target in ('home', 'shop', 'events', 'press', 'contact', 'account'))
    or (kind = 'page' and page_id is not null)
    or (kind = 'section' and section_id is not null)
    or (kind = 'link' and url is not null)
  )
);
create index if not exists menu_items_position_idx on menu_items (menu, position);
alter table menu_items enable row level security;
drop policy if exists "menu public read" on menu_items;
create policy "menu public read" on menu_items for select using (visible or is_admin());
drop policy if exists "menu admin write" on menu_items;
create policy "menu admin write" on menu_items for all using (is_admin()) with check (is_admin());

-- Collection and shop -----------------------------------------------------

-- Sections of the shop (Rings, Necklaces...). `visible = false` takes a
-- section and everything in it off the site without deleting it.
create table if not exists sections (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        not null unique check (slug ~ '^[a-z0-9-]+$'),
  name         jsonb       not null default '{}'::jsonb,
  description  jsonb       not null default '{}'::jsonb,
  cover_url    text,
  position     integer     not null default 0,
  visible      boolean     not null default true,
  show_prices  boolean     not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists sections_position_idx on sections (position);
alter table menu_items drop constraint if exists menu_items_section_fk;
alter table menu_items add constraint menu_items_section_fk
  foreign key (section_id) references sections (id) on delete cascade;

-- Values for the shop filters: metals and stones, managed in the admin.
create table if not exists attributes (
  id        uuid    primary key default gen_random_uuid(),
  kind      text    not null check (kind in ('metal', 'stone')),
  slug      text    not null check (slug ~ '^[a-z0-9-]+$'),
  label     jsonb   not null default '{}'::jsonb,
  position  integer not null default 0,
  unique (kind, slug)
);

-- A piece of jewelry. `price` may be empty; `show_price = false` shows
-- "Price on request" and the piece cannot be bought online. `stock` counts
-- what can still be sold; at 0 the piece shows as sold out. A piece with
-- sizes keeps its stock per size in piece_variants instead.
create table if not exists pieces (
  id               uuid        primary key default gen_random_uuid(),
  section_id       uuid        references sections (id) on delete set null,
  slug             text        not null unique check (slug ~ '^[a-z0-9-]+$'),
  title            jsonb       not null default '{}'::jsonb,
  description      jsonb       not null default '{}'::jsonb,
  details          jsonb       not null default '{}'::jsonb,
  price            numeric(12, 2) check (price is null or price >= 0),
  show_price       boolean     not null default true,
  for_sale         boolean     not null default true,
  stock            integer     not null default 1 check (stock >= 0),
  metal_id         uuid        references attributes (id) on delete set null,
  stone_id         uuid        references attributes (id) on delete set null,
  visible          boolean     not null default true,
  featured         boolean     not null default false,
  position         integer     not null default 0,
  seo_title        jsonb       not null default '{}'::jsonb,
  seo_description  jsonb       not null default '{}'::jsonb,
  published_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists pieces_section_idx on pieces (section_id, position);
create index if not exists pieces_published_idx on pieces (published_at desc);

-- Sizes (ring sizes, chain lengths), each with its own stock.
create table if not exists piece_variants (
  id         uuid    primary key default gen_random_uuid(),
  piece_id   uuid    not null references pieces (id) on delete cascade,
  label      text    not null,
  stock      integer not null default 0 check (stock >= 0),
  position   integer not null default 0
);
create index if not exists piece_variants_piece_idx on piece_variants (piece_id, position);

create table if not exists piece_images (
  id         uuid    primary key default gen_random_uuid(),
  piece_id   uuid    not null references pieces (id) on delete cascade,
  url        text    not null,
  alt        jsonb   not null default '{}'::jsonb,
  position   integer not null default 0
);
create index if not exists piece_images_piece_idx on piece_images (piece_id, position);

alter table sections enable row level security;
alter table attributes enable row level security;
alter table pieces enable row level security;
alter table piece_variants enable row level security;
alter table piece_images enable row level security;

drop policy if exists "sections public read" on sections;
create policy "sections public read" on sections for select using (visible or is_admin());
drop policy if exists "sections admin write" on sections;
create policy "sections admin write" on sections for all using (is_admin()) with check (is_admin());

drop policy if exists "attributes public read" on attributes;
create policy "attributes public read" on attributes for select using (true);
drop policy if exists "attributes admin write" on attributes;
create policy "attributes admin write" on attributes for all using (is_admin()) with check (is_admin());

-- A piece is public only if it is visible and its section (if any) is too.
drop policy if exists "pieces public read" on pieces;
create policy "pieces public read" on pieces for select using (
  is_admin()
  or (visible and (section_id is null or exists (
        select 1 from sections s where s.id = pieces.section_id and s.visible)))
);
drop policy if exists "pieces admin write" on pieces;
create policy "pieces admin write" on pieces for all using (is_admin()) with check (is_admin());

drop policy if exists "variants public read" on piece_variants;
create policy "variants public read" on piece_variants for select using (
  exists (select 1 from pieces p where p.id = piece_variants.piece_id)
);
drop policy if exists "variants admin write" on piece_variants;
create policy "variants admin write" on piece_variants for all using (is_admin()) with check (is_admin());

drop policy if exists "piece_images public read" on piece_images;
create policy "piece_images public read" on piece_images for select using (
  exists (select 1 from pieces p where p.id = piece_images.piece_id)
);
drop policy if exists "piece_images admin write" on piece_images;
create policy "piece_images admin write" on piece_images for all using (is_admin()) with check (is_admin());

-- Events ------------------------------------------------------------------

create table if not exists events (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        not null unique check (slug ~ '^[a-z0-9-]+$'),
  title        jsonb       not null default '{}'::jsonb,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  location     text        not null default '',
  summary      jsonb       not null default '{}'::jsonb,
  body         jsonb       not null default '{}'::jsonb,
  image_url    text,
  link_url     text,
  published    boolean     not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists events_starts_idx on events (starts_at);

alter table events enable row level security;
drop policy if exists "events public read" on events;
create policy "events public read" on events for select using (published or is_admin());
drop policy if exists "events admin write" on events;
create policy "events admin write" on events for all using (is_admin()) with check (is_admin());

-- Press -------------------------------------------------------------------

-- Articles about the brand: a link, an uploaded PDF or scan, or both.
create table if not exists press_articles (
  id            uuid        primary key default gen_random_uuid(),
  title         jsonb       not null default '{}'::jsonb,
  publication   text        not null default '',
  published_on  date,
  image_url     text,
  url           text,
  file_url      text,
  position      integer     not null default 0,
  published     boolean     not null default true,
  created_at    timestamptz not null default now()
);
alter table press_articles enable row level security;
drop policy if exists "press public read" on press_articles;
create policy "press public read" on press_articles for select using (published or is_admin());
drop policy if exists "press admin write" on press_articles;
create policy "press admin write" on press_articles for all using (is_admin()) with check (is_admin());

-- Customers and orders ----------------------------------------------------

-- A customer is a Supabase Auth user (email and password) with a profile.
create table if not exists customers (
  user_id     uuid        primary key,
  email       text        not null,
  name        text        not null default '',
  phone       text,
  address     jsonb       not null default '{}'::jsonb,
  locale      text        not null default 'en' check (locale in ('en', 'nl', 'fr')),
  created_at  timestamptz not null default now()
);
alter table customers enable row level security;
drop policy if exists "customers own" on customers;
create policy "customers own" on customers for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- Orders are written by the server only (checkout and the Stripe webhook use
-- the service role). Customers can read their own; admins read and update.
create sequence if not exists order_number_seq start 1001;
create table if not exists orders (
  id                     uuid        primary key default gen_random_uuid(),
  number                 integer     not null unique default nextval('order_number_seq'),
  customer_id            uuid        references customers (user_id) on delete set null,
  email                  text        not null,
  name                   text        not null default '',
  phone                  text,
  shipping_address       jsonb       not null default '{}'::jsonb,
  locale                 text        not null default 'en',
  status                 text        not null default 'pending'
                         check (status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  currency               text        not null default 'EUR',
  subtotal               numeric(12, 2) not null default 0,
  shipping               numeric(12, 2) not null default 0,
  tax                    numeric(12, 2) not null default 0,
  total                  numeric(12, 2) not null default 0,
  stripe_session_id      text        unique,
  stripe_payment_intent  text,
  payment_method         text,
  paid_at                timestamptz,
  carrier                text,
  tracking_number        text,
  tracking_url           text,
  shipped_at             timestamptz,
  delivered_at           timestamptz,
  gift_wrap              boolean     not null default false,
  gift_message           text,
  note                   text,
  invoice_number         text        unique,
  invoiced_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists orders_customer_idx on orders (customer_id, created_at desc);
create index if not exists orders_status_idx on orders (status, created_at desc);

create table if not exists order_items (
  id          uuid        primary key default gen_random_uuid(),
  order_id    uuid        not null references orders (id) on delete cascade,
  piece_id    uuid        references pieces (id) on delete set null,
  variant_id  uuid        references piece_variants (id) on delete set null,
  title       text        not null,
  variant     text,
  image_url   text,
  unit_price  numeric(12, 2) not null,
  quantity    integer     not null check (quantity > 0)
);
create index if not exists order_items_order_idx on order_items (order_id);

alter table orders enable row level security;
alter table order_items enable row level security;
drop policy if exists "orders own read" on orders;
create policy "orders own read" on orders for select using (customer_id = auth.uid() or is_admin());
drop policy if exists "orders admin update" on orders;
create policy "orders admin update" on orders for update using (is_admin()) with check (is_admin());
drop policy if exists "order_items own read" on order_items;
create policy "order_items own read" on order_items for select using (
  exists (select 1 from orders o where o.id = order_items.order_id and (o.customer_id = auth.uid() or is_admin()))
);

-- Invoice numbers run without gaps per year (2026-0001, 2026-0002, ...), as
-- Belgian accounting requires. The counter row is locked while a number is
-- taken, so two payments at the same moment never share one.
create table if not exists invoice_counters (
  year  integer primary key,
  last  integer not null default 0
);
alter table invoice_counters enable row level security;
drop policy if exists "invoice_counters admin read" on invoice_counters;
create policy "invoice_counters admin read" on invoice_counters for select using (is_admin());

create or replace function next_invoice_number() returns text
  language plpgsql security definer set search_path = public as $$
declare
  y integer := extract(year from now() at time zone 'Europe/Brussels')::integer;
  n integer;
begin
  insert into invoice_counters (year, last) values (y, 1)
    on conflict (year) do update set last = invoice_counters.last + 1
    returning last into n;
  return y::text || '-' || lpad(n::text, 4, '0');
end $$;
revoke all on function next_invoice_number() from public;
-- Supabase grants new functions to anon and authenticated; only the server may call these.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function next_invoice_number() from anon, authenticated';
  end if;
end $$;

-- Marks an order paid and takes its items out of stock, in one transaction.
-- Called by the Stripe webhook (service role). Safe to call twice: a second
-- call finds the order already paid and changes nothing. If something sold
-- out in the meantime the order is still marked paid (the money is taken) and
-- `oversold` tells the caller so the client can be contacted.
create or replace function mark_order_paid(p_order uuid, p_payment_intent text, p_method text)
  returns table (already_paid boolean, oversold boolean)
  language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  it record;
  short boolean := false;
begin
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'order % not found', p_order; end if;
  if o.status <> 'pending' then
    return query select true, false; return;
  end if;
  for it in select * from order_items where order_id = p_order loop
    if it.variant_id is not null then
      update piece_variants set stock = stock - it.quantity
        where id = it.variant_id and stock >= it.quantity;
    elsif it.piece_id is not null then
      update pieces set stock = stock - it.quantity
        where id = it.piece_id and stock >= it.quantity;
    end if;
    if not found then
      short := true;
      if it.variant_id is not null then
        update piece_variants set stock = 0 where id = it.variant_id;
      elsif it.piece_id is not null then
        update pieces set stock = 0 where id = it.piece_id;
      end if;
    end if;
  end loop;
  update orders set status = 'paid', paid_at = now(), stripe_payment_intent = p_payment_intent,
         payment_method = p_method, updated_at = now(),
         invoice_number = next_invoice_number(), invoiced_at = now()
   where id = p_order;
  return query select false, short;
end $$;
revoke all on function mark_order_paid(uuid, text, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function mark_order_paid(uuid, text, text) from anon, authenticated';
  end if;
end $$;

-- Wishlist ----------------------------------------------------------------

-- Saved pieces of a signed-in client. Visitors keep theirs in the browser;
-- it is merged into this table when they sign in.
create table if not exists wishlist_items (
  user_id     uuid        not null,
  piece_id    uuid        not null references pieces (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, piece_id)
);
alter table wishlist_items enable row level security;
drop policy if exists "wishlist own" on wishlist_items;
create policy "wishlist own" on wishlist_items for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid());

-- Newsletter --------------------------------------------------------------

-- Written by the server only (the signup form posts to an API route), so a
-- visitor can never read the list or find out who is subscribed.
create table if not exists newsletter_subscribers (
  id               uuid        primary key default gen_random_uuid(),
  email            text        not null unique check (char_length(email) <= 200),
  locale           text        not null default 'en',
  unsubscribe_token uuid       not null default gen_random_uuid(),
  unsubscribed_at  timestamptz,
  created_at       timestamptz not null default now()
);
alter table newsletter_subscribers enable row level security;
drop policy if exists "newsletter admin" on newsletter_subscribers;
create policy "newsletter admin" on newsletter_subscribers for all using (is_admin()) with check (is_admin());

-- Appointment requests ----------------------------------------------------

-- The contact form. Anyone may send one; only admins can read them back.
create table if not exists appointment_requests (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null check (char_length(name) between 1 and 200),
  email           text        check (email is null or char_length(email) <= 200),
  phone           text        check (phone is null or char_length(phone) <= 50),
  preferred_date  text        check (preferred_date is null or char_length(preferred_date) <= 100),
  message         text        not null default '' check (char_length(message) <= 4000),
  piece_id        uuid        references pieces (id) on delete set null,
  locale          text        not null default 'en',
  handled         boolean     not null default false,
  created_at      timestamptz not null default now(),
  check (email is not null or phone is not null)
);

alter table appointment_requests enable row level security;
drop policy if exists "requests public insert" on appointment_requests;
create policy "requests public insert" on appointment_requests for insert with check (handled = false);
drop policy if exists "requests admin all" on appointment_requests;
create policy "requests admin all" on appointment_requests for all using (is_admin()) with check (is_admin());

-- Instagram ---------------------------------------------------------------

-- Posts pulled from Instagram by the sync. Images are copied into our own
-- storage bucket, because Instagram's image links expire. `visible = false`
-- hides a post from the site and survives every later sync.
create table if not exists instagram_posts (
  id            uuid        primary key default gen_random_uuid(),
  instagram_id  text        not null unique,
  image_url     text        not null,
  caption       text        not null default '',
  permalink     text        not null,
  media_type    text        not null default 'IMAGE',
  taken_at      timestamptz,
  visible       boolean     not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists instagram_posts_taken_idx on instagram_posts (taken_at desc);

alter table instagram_posts enable row level security;
drop policy if exists "instagram public read" on instagram_posts;
create policy "instagram public read" on instagram_posts for select using (visible or is_admin());
drop policy if exists "instagram admin write" on instagram_posts;
create policy "instagram admin write" on instagram_posts for all using (is_admin()) with check (is_admin());

-- Private key/value store (Instagram token and sync state). Never public.
create table if not exists app_settings (
  key         text        primary key,
  value       text        not null,
  updated_at  timestamptz not null default now()
);
alter table app_settings enable row level security;
drop policy if exists "app_settings admin" on app_settings;
create policy "app_settings admin" on app_settings for all using (is_admin()) with check (is_admin());

-- Storage -----------------------------------------------------------------

-- Public bucket for every uploaded image and press PDF. Skipped where there is
-- no storage schema (the PGlite test database).
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute $m$ insert into storage.buckets (id, name, public) values ('media', 'media', true)
                on conflict (id) do nothing $m$;
    execute $m$ drop policy if exists "media public read" on storage.objects $m$;
    execute $m$ create policy "media public read" on storage.objects
                for select using (bucket_id = 'media') $m$;
    execute $m$ drop policy if exists "media admin insert" on storage.objects $m$;
    execute $m$ create policy "media admin insert" on storage.objects
                for insert to authenticated with check (bucket_id = 'media' and is_admin()) $m$;
    execute $m$ drop policy if exists "media admin update" on storage.objects $m$;
    execute $m$ create policy "media admin update" on storage.objects
                for update to authenticated using (bucket_id = 'media' and is_admin())
                with check (bucket_id = 'media' and is_admin()) $m$;
    execute $m$ drop policy if exists "media admin delete" on storage.objects $m$;
    execute $m$ create policy "media admin delete" on storage.objects
                for delete to authenticated using (bucket_id = 'media' and is_admin()) $m$;
  end if;
end $$;
