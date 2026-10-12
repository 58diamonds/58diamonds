'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Help, Loading, PageTitle, inputCls } from '@/components/admin/ui';
import { downloadCsv } from '@/lib/admin-client';
import { formatPrice } from '@/lib/format';
import { getAdminDb } from '@/lib/supabase';
import type { Customer, Order } from '@/lib/types';

interface Subscriber {
  id: string;
  email: string;
  locale: string;
  unsubscribed_at: string | null;
  confirmed_at: string | null;
  source: string | null;
  created_at: string;
}

interface Row {
  email: string;
  name: string;
  phone: string | null;
  account: boolean;
  orders: number;
  spent: number;
  last: string | null;
}

const SOLD = ['paid', 'processing', 'shipped', 'delivered'];
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '');

/** Everyone who bought or made an account, and the newsletter list. */
export default function ClientsAdmin() {
  const db = getAdminDb();
  const [tab, setTab] = useState<'clients' | 'newsletter'>('clients');
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([
      db.from('customers').select('*'),
      db.from('orders').select('id, customer_id, email, name, phone, status, total, currency, created_at').neq('status', 'pending'),
      db.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }),
    ]).then(([c, o, n]) => {
      setCustomers((c.data ?? []) as Customer[]);
      setOrders((o.data ?? []) as Order[]);
      setSubs((n.data ?? []) as Subscriber[]);
    });
  }, [db]);

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    const get = (email: string) => {
      const key = email.trim().toLowerCase();
      if (!map.has(key)) map.set(key, { email: key, name: '', phone: null, account: false, orders: 0, spent: 0, last: null });
      return map.get(key)!;
    };
    for (const c of customers ?? []) Object.assign(get(c.email), { name: c.name, phone: c.phone, account: true });
    for (const o of orders) {
      if (!o.email) continue;
      const r = get(o.email);
      r.name ||= o.name;
      r.phone ||= o.phone;
      if (SOLD.includes(o.status)) {
        r.orders += 1;
        r.spent += Number(o.total);
        if (!r.last || o.created_at > r.last) r.last = o.created_at;
      }
    }
    const q = query.trim().toLowerCase();
    return [...map.values()]
      .filter((r) => !q || r.email.includes(q) || r.name.toLowerCase().includes(q))
      .sort((a, b) => (b.last ?? '').localeCompare(a.last ?? '') || a.email.localeCompare(b.email));
  }, [customers, orders, query]);

  if (!customers) return <Loading />;
  // Only confirmed addresses may be emailed (double opt-in).
  const active = subs.filter((s) => s.confirmed_at && !s.unsubscribed_at);

  return (
    <div>
      <PageTitle title="Clients">
        {tab === 'clients' ? (
          <Button onClick={() => downloadCsv('58-diamonds-clients.csv', [['Email', 'Name', 'Phone', 'Account', 'Orders', 'Spent (EUR)', 'Last order'], ...rows.map((r) => [r.email, r.name, r.phone ?? '', r.account ? 'yes' : 'no', r.orders, r.spent.toFixed(2), day(r.last)])])}>
            Download list
          </Button>
        ) : (
          <Button onClick={() => downloadCsv('58-diamonds-newsletter.csv', [['Email', 'Language', 'Signed up', 'Confirmed', 'Form'], ...active.map((s) => [s.email, s.locale, day(s.created_at), day(s.confirmed_at), s.source ?? ''])])}>
            Download list
          </Button>
        )}
      </PageTitle>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button type="button" className="chip" aria-pressed={tab === 'clients'} onClick={() => setTab('clients')}>
          Clients ({rows.length})
        </button>
        <button type="button" className="chip" aria-pressed={tab === 'newsletter'} onClick={() => setTab('newsletter')}>
          Newsletter ({active.length})
        </button>
        {tab === 'clients' && <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" aria-label="Search clients" className={`${inputCls} !mt-0 ml-auto max-w-60`} />}
      </div>

      {tab === 'clients' ? (
        <>
          <Help>Everyone with an account or a paid order. Clients manage their own details from their account.</Help>
          <div className="overflow-x-auto border border-[var(--color-line)] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--color-stone)]">
                <tr>
                  <th className="p-3 font-normal">Client</th>
                  <th className="p-3 font-normal">Phone</th>
                  <th className="p-3 text-right font-normal">Orders</th>
                  <th className="p-3 text-right font-normal">Spent</th>
                  <th className="p-3 font-normal">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {rows.map((r) => (
                  <tr key={r.email}>
                    <td className="p-3">
                      <span className="block">{r.name || '(no name)'} {r.account && <Badge>Account</Badge>}</span>
                      <a href={`mailto:${r.email}`} className="text-xs text-[var(--color-stone)] underline underline-offset-2">{r.email}</a>
                    </td>
                    <td className="p-3">{r.phone}</td>
                    <td className="p-3 text-right">{r.orders}</td>
                    <td className="p-3 text-right">{r.spent ? formatPrice(r.spent, 'EUR', 'en') : ''}</td>
                    <td className="p-3">{day(r.last)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-[var(--color-stone)]">No clients yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <Help>
            People who signed up for news. Download the list to send your news from your email program; those who unsubscribed are left out.
          </Help>
          <ul className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-white">
            {subs.map((s) => (
              <li key={s.id} className={`flex flex-wrap items-center gap-3 p-3 text-sm ${s.unsubscribed_at ? 'opacity-50' : ''}`}>
                <span className="flex-1">{s.email}</span>
                <span className="uppercase text-[var(--color-stone)]">{s.locale}</span>
                <span className="text-[var(--color-stone)]">{day(s.created_at)}</span>
                {s.unsubscribed_at ? <Badge>Unsubscribed</Badge> : !s.confirmed_at && <Badge>Waiting for confirmation</Badge>}
              </li>
            ))}
            {subs.length === 0 && <li className="p-4 text-sm text-[var(--color-stone)]">No signups yet.</li>}
          </ul>
        </>
      )}
    </div>
  );
}
