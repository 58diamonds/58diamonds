'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OrderStatusBadge } from '@/components/admin/orders';
import { Card, Loading, PageTitle, show } from '@/components/admin/ui';
import { SHOP_LIVE } from '@/lib/config';
import { formatPrice } from '@/lib/format';
import { pieceStock } from '@/lib/shop';
import { getAdminDb } from '@/lib/supabase';
import type { AppointmentRequest, Order, Piece, Settings } from '@/lib/types';

/** The first screen: what needs doing on the website. */
export default function Overview() {
  return SHOP_LIVE ? <ShopOverview /> : <SiteOverview />;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function SiteOverview() {
  const [data, setData] = useState<{ requests: AppointmentRequest[]; open: number; events: number; pieces: number; subscribers: number; me: string } | null>(null);

  useEffect(() => {
    const db = getAdminDb();
    Promise.all([
      db.from('appointment_requests').select('*').eq('handled', false).order('created_at', { ascending: false }).limit(3),
      db.from('appointment_requests').select('id', { count: 'exact', head: true }).eq('handled', false),
      db.from('events').select('id', { count: 'exact', head: true }).eq('published', true).gte('starts_at', new Date().toISOString()),
      db.from('pieces').select('id', { count: 'exact', head: true }).eq('visible', true),
      db.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).is('unsubscribed_at', null),
      db.auth.getUser().then(async ({ data: u }) => (u.user ? (await db.from('admins').select('username').eq('user_id', u.user.id).maybeSingle()).data?.username : null)),
    ]).then(([r, o, e, p, n, me]) =>
      setData({ requests: (r.data ?? []) as AppointmentRequest[], open: o.count ?? 0, events: e.count ?? 0, pieces: p.count ?? 0, subscribers: n.count ?? 0, me: (me as string | null) ?? '' }),
    );
  }, []);

  if (!data) return <Loading />;
  const name = data.me ? data.me.charAt(0).toUpperCase() + data.me.slice(1) : '';
  const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div>
      <PageTitle title={`${greeting()}${name ? `, ${name}` : ''}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [String(data.open), 'open appointment requests', '/admin/requests'],
          [String(data.events), 'upcoming events on the site', '/admin/events'],
          [String(data.pieces), 'pieces in the collection', '/admin/pieces'],
          [String(data.subscribers), 'newsletter subscribers', '/admin/newsletter'],
        ].map(([value, label, href]) => (
          <Link key={label} href={href} className="border border-[var(--color-line)] bg-white p-5 hover:border-[var(--color-gold)]">
            <p className="font-display text-4xl">{value}</p>
            <p className="mt-1 text-[var(--color-stone)]">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6">
        <Card title="Newest requests">
          {data.requests.length === 0 ? (
            <p className="text-[var(--color-stone)]">No open requests.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
              {data.requests.map((r) => (
                <li key={r.id} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block">{r.name}</span>
                    <span className="line-clamp-2 text-[var(--color-stone)]">{r.message}</span>
                  </span>
                  <span className="text-[var(--color-stone)]">{when(r.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/requests" className="btn btn-light mt-5 !min-h-9 !px-4">All requests</Link>
        </Card>

        <Card title="Add something">
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/pieces?new=1" className="btn btn-light !min-h-9 !px-4">A piece to the collection</Link>
            <Link href="/admin/pages?new=1" className="btn btn-light !min-h-9 !px-4">A page</Link>
            <Link href="/admin/menu?new=1" className="btn btn-light !min-h-9 !px-4">A menu item</Link>
            <Link href="/admin/events?new=1" className="btn btn-light !min-h-9 !px-4">An event</Link>
            <Link href="/admin/press" className="btn btn-light !min-h-9 !px-4">A press article</Link>
          </div>
          <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/admin/home" className="underline underline-offset-4">Change the homepage photos</Link>
            <Link href="/admin/texts" className="underline underline-offset-4">Edit a text</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

function ShopOverview() {
  const [data, setData] = useState<{ orders: Order[]; requests: number; pieces: Piece[]; settings: Settings | null; subscribers: number } | null>(null);

  useEffect(() => {
    const db = getAdminDb();
    const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString();
    Promise.all([
      db.from('orders').select('*').neq('status', 'pending').neq('status', 'cancelled').gte('created_at', yearAgo).order('created_at', { ascending: false }),
      db.from('appointment_requests').select('id', { count: 'exact', head: true }).eq('handled', false),
      db.from('pieces').select('*, piece_variants(*)').eq('visible', true),
      db.from('settings').select('*').eq('id', 1).maybeSingle(),
      db.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).is('unsubscribed_at', null),
    ]).then(([o, r, p, s, n]) =>
      setData({ orders: (o.data ?? []) as Order[], requests: r.count ?? 0, pieces: (p.data ?? []) as Piece[], settings: s.data as Settings | null, subscribers: n.count ?? 0 }),
    );
  }, []);

  if (!data) return <Loading />;
  const toShip = data.orders.filter((o) => o.status === 'paid' || o.status === 'processing');
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const paid = data.orders.filter((o) => o.status !== 'refunded');
  const month = paid.filter((o) => new Date(o.created_at) >= monthStart);
  const sum = (list: Order[]) => list.reduce((s, o) => s + Number(o.total), 0);
  const low = data.pieces.filter((p) => p.for_sale && p.show_price && p.price != null && pieceStock(p) <= 1);

  return (
    <div>
      <PageTitle title="Overview" />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[
          ['To ship', String(toShip.length), '/admin/orders'],
          ['Open requests', String(data.requests), '/admin/requests'],
          ['Sales this month', formatPrice(sum(month), 'EUR'), '/admin/orders'],
          ['Newsletter', String(data.subscribers), '/admin/newsletter'],
        ].map(([label, value, href]) => (
          <Link key={label} href={href} className="border border-[var(--color-line)] bg-white p-5 hover:border-[var(--color-gold)]">
            <p className="eyebrow">{label}</p>
            <p className="font-display mt-2 text-4xl">{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Orders to ship">
          {toShip.length === 0 ? (
            <p className="text-sm text-[var(--color-stone)]">All shipped.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {toShip.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-2.5 hover:text-[var(--color-gold)]">
                    <span className="font-display text-xl">#{o.number}</span>
                    <span className="flex-1 truncate text-sm">{o.name}</span>
                    <OrderStatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Last one left or sold out">
          {low.length === 0 ? (
            <p className="text-sm text-[var(--color-stone)]">Nothing running low.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {low.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/pieces/${p.id}`} className="flex justify-between py-2.5 text-sm hover:text-[var(--color-gold)]">
                    <span>{show(p.title)}</span>
                    <span>{pieceStock(p) === 0 ? 'Sold out' : '1 left'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Last 12 months">
          <p className="font-display text-3xl">{formatPrice(sum(paid), 'EUR')}</p>
          <p className="text-sm text-[var(--color-stone)]">{paid.length} orders</p>
        </Card>
        <Card title="Switches">
          <ul className="space-y-1 text-sm">
            <li>Online shop: {data.settings?.shop_enabled ? 'on' : 'off'}</li>
            <li>Press page: {data.settings?.press_enabled ? 'on' : 'off'}</li>
            <li>Events page: {data.settings?.events_enabled ? 'on' : 'off'}</li>
          </ul>
          <Link href="/admin/settings" className="mt-3 inline-block text-sm underline underline-offset-4">Change in Settings</Link>
        </Card>
      </div>
    </div>
  );
}
