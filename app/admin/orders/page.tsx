'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OrderStatusBadge } from '@/components/admin/orders';
import { Badge, Help, Loading, PageTitle, inputCls } from '@/components/admin/ui';
import { formatDate, formatPrice } from '@/lib/format';
import { getAdminDb } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';

const FILTERS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: 'todo', label: 'To ship', statuses: ['paid', 'processing'] },
  { key: 'shipped', label: 'Shipped', statuses: ['shipped', 'delivered'] },
  { key: 'all', label: 'All paid', statuses: ['paid', 'processing', 'shipped', 'delivered', 'refunded'] },
  { key: 'other', label: 'Unpaid and cancelled', statuses: ['pending', 'cancelled'] },
];

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<(Order & { order_items: { title: string; quantity: number }[] })[] | null>(null);
  const [filter, setFilter] = useState('todo');
  const [query, setQuery] = useState('');

  useEffect(() => {
    getAdminDb()
      .from('orders')
      .select('*, order_items(title, quantity)')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => setOrders((data ?? []) as never));
  }, []);

  if (!orders) return <Loading />;
  const statuses = FILTERS.find((f) => f.key === filter)!.statuses;
  const q = query.trim().toLowerCase();
  const shown = orders
    .filter((o) => statuses.includes(o.status))
    .filter((o) => !q || String(o.number).includes(q) || o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q));

  return (
    <div>
      <PageTitle title="Orders" />
      <Help>Paid orders appear here as soon as the payment is through. Open one to add the tracking number; the client gets an email with the link.</Help>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label} ({orders.filter((o) => f.statuses.includes(o.status)).length})
          </button>
        ))}
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Number, name or email" aria-label="Search orders" className={`${inputCls} !mt-0 ml-auto max-w-64`} />
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-[var(--color-stone)]">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-white">
          {shown.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-x-5 gap-y-1 p-4 hover:bg-[var(--color-pearl)]/50">
                <span className="font-display w-20 text-2xl">#{o.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.name || o.email || 'Not filled in yet'}</span>
                  <span className="block truncate text-xs text-[var(--color-stone)]">
                    {o.order_items.map((i) => `${i.title}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
                  </span>
                </span>
                <span className="text-xs text-[var(--color-stone)]">{formatDate(o.created_at, 'en', true)}</span>
                <OrderStatusBadge status={o.status} />
                {o.gift_wrap && <Badge tone="gold">Gift</Badge>}
                <span className="w-24 text-right">{formatPrice(Number(o.total), o.currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
