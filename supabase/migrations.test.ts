import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Runs every migration on an in-memory Postgres and checks the row-level
 * security as the three kinds of caller: an anonymous visitor, a signed-in
 * user who is not an admin, an admin who has not entered the authenticator
 * code yet, and a fully signed-in admin.
 *
 * Supabase's `auth.uid()` and roles are stubbed so the policies run unchanged.
 */

const ADMIN = '00000000-0000-0000-0000-00000000000a';
const STRANGER = '00000000-0000-0000-0000-00000000000b';
const CUSTOMER = '00000000-0000-0000-0000-00000000000c';
const EDITOR = '00000000-0000-0000-0000-00000000000d';
const BLOCKED = '00000000-0000-0000-0000-00000000000e';

let db: PGlite;

async function as(user: string | null, sql: string, params: unknown[] = [], aal = 'aal2') {
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}`);
  await db.query(`select set_config('test.uid', $1, false)`, [user ?? '']);
  await db.query(`select set_config('test.aal', $1, false)`, [user ? aal : '']);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select jsonb_build_object('aal', current_setting('test.aal', true)) $$;
    grant usage on schema auth to anon, authenticated;
  `);
  const dir = join(__dirname, 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    insert into admins (user_id, username, email, role) values ('${ADMIN}', 'farah', 'farah@example.com', 'owner');
    insert into admins (user_id, username, role) values ('${EDITOR}', 'editor1', 'editor');
    insert into admins (user_id, username, role, blocked) values ('${BLOCKED}', 'gone', 'admin', true);
    insert into sections (id, slug, name, visible) values
      ('10000000-0000-0000-0000-000000000001', 'rings', '{"en":"Rings"}', true),
      ('10000000-0000-0000-0000-000000000002', 'archive', '{"en":"Archive"}', false);
    insert into pieces (id, slug, title, section_id, visible, price, stock) values
      ('20000000-0000-0000-0000-000000000001', 'shown', '{"en":"Shown"}', '10000000-0000-0000-0000-000000000001', true, 1000, 2),
      ('20000000-0000-0000-0000-000000000002', 'hidden-piece', '{"en":"Hidden"}', '10000000-0000-0000-0000-000000000001', false, 1000, 1),
      ('20000000-0000-0000-0000-000000000003', 'in-hidden-section', '{"en":"x"}', '10000000-0000-0000-0000-000000000002', true, 1000, 1);
    insert into events (slug, title, starts_at, published) values
      ('open', '{"en":"Open"}', now(), true), ('draft', '{"en":"Draft"}', now(), false);
    insert into press_articles (publication, published) values ('Vogue', true), ('Draft mag', false);
    insert into customers (user_id, email) values ('${CUSTOMER}', 'ana@example.com'), ('${STRANGER}', 'me@example.com');
    insert into orders (id, customer_id, email, total) values
      ('30000000-0000-0000-0000-000000000001', '${CUSTOMER}', 'ana@example.com', 2000);
    insert into order_items (order_id, piece_id, title, unit_price, quantity) values
      ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Shown', 1000, 2);
  `);
});

describe('public visitors', () => {
  it('see only visible pieces in visible sections', async () => {
    const { rows } = await as(null, 'select slug from pieces order by slug');
    expect(rows.map((r: any) => r.slug)).toEqual(['shown']);
  });

  it('do not see hidden sections, draft events or unpublished press', async () => {
    expect((await as(null, 'select slug from sections')).rows).toHaveLength(1);
    expect((await as(null, 'select slug from events')).rows.map((r: any) => r.slug)).toEqual(['open']);
    expect((await as(null, 'select publication from press_articles')).rows).toHaveLength(1);
  });

  it('can send an appointment request but not read requests back', async () => {
    await as(null, `insert into appointment_requests (name, email) values ('Ana', 'ana@example.com')`);
    expect((await as(null, 'select * from appointment_requests')).rows).toHaveLength(0);
  });

  it('cannot book a time directly or read the booking settings', async () => {
    await expect(as(null, `insert into appointment_requests (name, email, status, starts_at) values ('Ana', 'ana@example.com', 'confirmed', now())`)).rejects.toThrow();
    expect((await as(null, 'select * from booking_settings')).rows).toHaveLength(0);
    expect((await as(STRANGER, 'select * from booking_settings')).rows).toHaveLength(0);
    expect((await as(ADMIN, 'select * from booking_settings')).rows).toHaveLength(1);
  });

  it('cannot send a request with no way to reply', async () => {
    await expect(as(null, `insert into appointment_requests (name) values ('Ana')`)).rejects.toThrow();
  });

  it('cannot change anything', async () => {
    await as(null, `update pieces set price = 1`);
    await as(null, `update site_texts set value = '{}'`);
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from pieces where price = 1`);
    expect(rows[0].n).toBe(0);
    await expect(as(null, `insert into sections (slug) values ('x')`)).rejects.toThrow();
    await expect(as(null, `insert into orders (email) values ('x@example.com')`)).rejects.toThrow();
  });

  it('cannot read orders, customers or the Instagram token', async () => {
    await db.exec(`insert into app_settings (key, value) values ('instagram_access_token', 'secret')`);
    expect((await as(null, 'select * from app_settings')).rows).toHaveLength(0);
    expect((await as(null, 'select * from orders')).rows).toHaveLength(0);
    expect((await as(null, 'select * from customers')).rows).toHaveLength(0);
  });
});

describe('a customer', () => {
  it('sees only their own orders and profile', async () => {
    expect((await as(CUSTOMER, 'select number from orders')).rows).toHaveLength(1);
    expect((await as(CUSTOMER, 'select title from order_items')).rows).toHaveLength(1);
    expect((await as(STRANGER, 'select number from orders')).rows).toHaveLength(0);
    expect((await as(STRANGER, 'select title from order_items')).rows).toHaveLength(0);
    expect((await as(STRANGER, 'select email from customers')).rows.map((r: any) => r.email)).toEqual(['me@example.com']);
  });

  it('cannot change an order or make themselves admin', async () => {
    await as(CUSTOMER, `update orders set status = 'shipped'`);
    const { rows } = await db.query<{ status: string }>('select status from orders');
    expect(rows[0].status).toBe('pending');
    await expect(as(STRANGER, `insert into admins (user_id, username, email) values ('${STRANGER}', 'me', 'me@example.com')`)).rejects.toThrow();
    await expect(as(STRANGER, `insert into pieces (slug) values ('x2')`)).rejects.toThrow();
  });
});

describe('an admin', () => {
  it('sees and edits everything once signed in with username and password', async () => {
    expect((await as(ADMIN, 'select slug from pieces', [], 'aal1')).rows).toHaveLength(3);
    expect((await as(ADMIN, 'select slug from pieces')).rows).toHaveLength(3);
    expect((await as(ADMIN, 'select * from appointment_requests')).rows).toHaveLength(1);
    expect((await as(ADMIN, 'select * from orders')).rows).toHaveLength(1);
    await as(ADMIN, `update orders set tracking_number = 'TRACK1'`);
    const { rows } = await db.query<{ tracking_number: string }>('select tracking_number from orders');
    expect(rows[0].tracking_number).toBe('TRACK1');
  });

  it('keeps pieces when their section is deleted', async () => {
    await as(ADMIN, `delete from sections where slug = 'archive'`);
    const { rows } = await db.query<{ section_id: string | null }>(`select section_id from pieces where slug = 'in-hidden-section'`);
    expect(rows[0].section_id).toBeNull();
  });
});

describe('paying for an order', () => {
  const ORDER = '30000000-0000-0000-0000-000000000001';

  it('takes the items out of stock once, even if the webhook comes twice', async () => {
    const first = await db.query<any>(`select * from mark_order_paid('${ORDER}', 'pi_1', 'card')`);
    expect(first.rows[0]).toEqual({ already_paid: false, oversold: false });
    const second = await db.query<any>(`select * from mark_order_paid('${ORDER}', 'pi_1', 'card')`);
    expect(second.rows[0].already_paid).toBe(true);
    const { rows } = await db.query<{ stock: number }>(`select stock from pieces where slug = 'shown'`);
    expect(rows[0].stock).toBe(0);
    expect((await db.query<any>('select status from orders')).rows[0].status).toBe('paid');
  });

  it('reports when a piece sold out in the meantime', async () => {
    await db.exec(`
      insert into orders (id, email) values ('30000000-0000-0000-0000-000000000002', 'b@example.com');
      insert into order_items (order_id, piece_id, title, unit_price, quantity) values
        ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Shown', 1000, 1);
    `);
    const r = await db.query<any>(`select * from mark_order_paid('30000000-0000-0000-0000-000000000002', 'pi_2', 'card')`);
    expect(r.rows[0].oversold).toBe(true);
  });

  it('gives each paid order the next invoice number, once', async () => {
    const { rows } = await db.query<{ invoice_number: string }>(
      `select invoice_number from orders where invoice_number is not null order by number`,
    );
    const year = new Date().getFullYear();
    expect(rows.map((r) => r.invoice_number)).toEqual([`${year}-0001`, `${year}-0002`]);
  });
});

describe('wishlist and newsletter', () => {
  it('keeps each client\'s wishlist private', async () => {
    await as(CUSTOMER, `insert into wishlist_items (user_id, piece_id) values ($1, '20000000-0000-0000-0000-000000000001')`, [CUSTOMER]);
    await expect(
      as(STRANGER, `insert into wishlist_items (user_id, piece_id) values ($1, '20000000-0000-0000-0000-000000000001')`, [CUSTOMER]),
    ).rejects.toThrow();
    expect((await as(CUSTOMER, 'select * from wishlist_items')).rows).toHaveLength(1);
    expect((await as(STRANGER, 'select * from wishlist_items')).rows).toHaveLength(0);
  });

  it('never shows the subscriber list to visitors or clients', async () => {
    await db.exec(`insert into newsletter_subscribers (email) values ('fan@example.com')`);
    expect((await as(null, 'select * from newsletter_subscribers')).rows).toHaveLength(0);
    expect((await as(CUSTOMER, 'select * from newsletter_subscribers')).rows).toHaveLength(0);
    await expect(as(null, `insert into newsletter_subscribers (email) values ('x@example.com')`)).rejects.toThrow();
    expect((await as(ADMIN, 'select * from newsletter_subscribers')).rows).toHaveLength(1);
  });
});

describe('seed.sql', () => {
  it('loads on a fresh database, twice, without errors', async () => {
    const fresh = new PGlite();
    await fresh.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    `);
    const dir = join(__dirname, 'migrations');
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) await fresh.exec(readFileSync(join(dir, file), 'utf8'));
    const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf8');
    await fresh.exec(seed);
    await fresh.exec(seed);
    const { rows } = await fresh.query<{ n: number }>('select count(*)::int as n from pieces');
    expect(rows[0].n).toBeGreaterThan(5);
    const menu = await fresh.query<{ n: number }>('select count(*)::int as n from menu_items');
    expect(menu.rows[0].n).toBeGreaterThan(3);
  });
});

describe('admin roles', () => {
  it('lets an editor change content but not read requests, clients, orders or the newsletter', async () => {
    expect((await as(EDITOR, 'select slug from pieces')).rows).toHaveLength(3);
    await as(EDITOR, `update pieces set stock = 5 where slug = 'shown'`);
    expect((await db.query<{ stock: number }>(`select stock from pieces where slug = 'shown'`)).rows[0].stock).toBe(5);
    await as(ADMIN, `update pieces set stock = 2 where slug = 'shown'`);
    expect((await as(EDITOR, 'select id from appointment_requests')).rows).toHaveLength(0);
    expect((await as(EDITOR, 'select email from customers')).rows).toHaveLength(0);
    expect((await as(EDITOR, 'select number from orders')).rows).toHaveLength(0);
    expect((await as(EDITOR, 'select id from newsletter_subscribers')).rows).toHaveLength(0);
    expect((await as(EDITOR, 'select admin_role() as r')).rows[0]).toEqual({ r: 'editor' });
  });

  it('treats a blocked admin as nobody', async () => {
    expect((await as(BLOCKED, 'select is_admin() as a')).rows[0]).toEqual({ a: false });
    expect((await as(BLOCKED, 'select admin_role() as r')).rows[0]).toEqual({ r: null });
    const stranger = (await as(STRANGER, 'select slug from pieces order by slug')).rows;
    expect((await as(BLOCKED, 'select slug from pieces order by slug')).rows).toEqual(stranger);
    expect((await as(BLOCKED, 'select id from appointment_requests')).rows).toHaveLength(0);
  });

  it('lets the owner read requests', async () => {
    expect((await as(ADMIN, 'select admin_role() as r')).rows[0]).toEqual({ r: 'owner' });
  });
});
