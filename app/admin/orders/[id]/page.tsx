'use client';

/* eslint-disable @next/next/no-img-element */
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { OrderStatusBadge, STATUS_LABEL } from '@/components/admin/orders';
import { Badge, Button, Card, Loading, PageTitle, SelectField, TextField } from '@/components/admin/ui';
import { adminFetch } from '@/lib/admin-client';
import { CARRIERS, trackingUrl } from '@/lib/carriers';
import { formatDate, formatPrice } from '@/lib/format';
import { getAdminDb } from '@/lib/supabase';
import type { Order, OrderItem, OrderStatus } from '@/lib/types';
import { askConfirm } from '@/components/admin/confirm';

type Full = Order & { order_items: OrderItem[]; stripe_payment_intent: string | null };

export default function OrderAdmin() {
  const { id } = useParams<{ id: string }>();
  const db = getAdminDb();
  const [order, setOrder] = useState<Full | null>(null);
  const [carrier, setCarrier] = useState('bpost');
  const [number, setNumber] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await db.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
    const o = data as Full | null;
    setOrder(o);
    if (o) {
      setCarrier(o.carrier ?? 'bpost');
      setNumber(o.tracking_number ?? '');
      setUrl(o.tracking_url ?? '');
      setNote(o.note ?? '');
    }
  }, [db, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!order) return <Loading />;
  const money = (n: number) => formatPrice(Number(n), order.currency);
  const a = order.shipping_address ?? {};

  async function setStatus(status: OrderStatus, extra: Partial<Order> = {}) {
    setBusy(true);
    const { error } = await db.from('orders').update({ status, ...extra, updated_at: new Date().toISOString() }).eq('id', id);
    setBusy(false);
    if (error) return setMessage(error.message);
    await load();
  }

  async function ship(notify: boolean) {
    const link = url.trim() || trackingUrl(carrier, number, a.postal_code) || null;
    await setStatus('shipped', { carrier, tracking_number: number.trim() || null, tracking_url: link, shipped_at: order!.shipped_at ?? new Date().toISOString() });
    if (notify) {
      const res = await adminFetch('/api/admin/shipped-email', { orderId: id }).catch(() => null);
      setMessage(res?.sent ? `Marked as shipped. ${order!.email} has the tracking link.` : 'Marked as shipped. The email could not be sent; check the email settings.');
    } else setMessage('Saved.');
  }

  async function downloadInvoice() {
    const { data } = await db.auth.getSession();
    const res = await fetch(`/api/invoice/${id}`, { headers: { authorization: `Bearer ${data.session?.access_token ?? ''}` } });
    if (!res.ok) return setMessage('No invoice for this order (it is not paid).');
    const href = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = href;
    link.download = `invoice-${order!.invoice_number}.pdf`;
    link.click();
  }

  return (
    <div>
      <PageTitle title={`Order #${order.number}`} back={{ href: '/admin/orders', label: 'Orders' }}>
        <OrderStatusBadge status={order.status} />
      </PageTitle>
      {message && <p className="mb-5 border-l-2 border-[var(--color-gold)] bg-white p-3 text-sm">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Card title="Items">
            <ul className="divide-y divide-[var(--color-line)]">
              {order.order_items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <div className="h-16 w-14 shrink-0 bg-[var(--color-pearl)]">{i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="flex-1">
                    <p className="font-display text-xl">{i.title}</p>
                    <p className="text-xs text-[var(--color-stone)]">
                      {i.variant && <>Size {i.variant} · </>}
                      {i.quantity} × {money(i.unit_price)}
                    </p>
                  </div>
                  <p>{money(i.unit_price * i.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-[var(--color-line)] pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Shipping</dt><dd>{money(order.shipping)}</dd></div>
              {Number(order.total) - Number(order.subtotal) - Number(order.shipping) > 0 && (
                <div className="flex justify-between"><dt>Gift wrapping</dt><dd>{money(Number(order.total) - Number(order.subtotal) - Number(order.shipping))}</dd></div>
              )}
              <div className="flex justify-between text-base"><dt>Total</dt><dd>{money(order.total)}</dd></div>
            </dl>
            {order.gift_wrap && (
              <div className="mt-4 bg-[var(--color-pearl)] p-3 text-sm">
                <Badge tone="gold">Gift wrap</Badge>
                {order.gift_message && <p className="mt-2 whitespace-pre-line italic">“{order.gift_message}”</p>}
              </div>
            )}
          </Card>

          {(order.status === 'paid' || order.status === 'processing' || order.status === 'shipped') && (
            <Card title="Shipping">
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Carrier" value={carrier} onChange={setCarrier} options={[...CARRIERS.map((c) => ({ value: c.name, label: c.name })), { value: 'Other', label: 'Other' }]} />
                <TextField label="Tracking number" value={number} onChange={setNumber} />
              </div>
              <div className="mt-4">
                <TextField label="Tracking link (optional)" value={url} onChange={setUrl} hint="Leave empty: the link is made from the carrier and number." />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {order.status !== 'shipped' && (
                  <>
                    <Button tone="dark" disabled={busy} onClick={() => ship(true)}>Mark shipped and email the client</Button>
                    {order.status === 'paid' && <Button disabled={busy} onClick={() => setStatus('processing')}>Mark as being prepared</Button>}
                  </>
                )}
                {order.status === 'shipped' && (
                  <>
                    <Button disabled={busy} onClick={() => ship(true)}>Save and email the link again</Button>
                    <Button tone="dark" disabled={busy} onClick={() => setStatus('delivered', { delivered_at: new Date().toISOString() })}>Mark delivered</Button>
                  </>
                )}
              </div>
            </Card>
          )}

          <Card title="Private note">
            <TextField label="Only you see this" value={note} onChange={setNote} multiline rows={3} />
            <div className="mt-3">
              <Button onClick={async () => { await db.from('orders').update({ note }).eq('id', id); setMessage('Note saved.'); }}>Save note</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Client">
            <p>{order.name || '-'}</p>
            <p className="text-sm"><a href={`mailto:${order.email}`} className="underline underline-offset-4">{order.email}</a></p>
            {order.phone && <p className="text-sm"><a href={`tel:${order.phone}`} className="underline underline-offset-4">{order.phone}</a></p>}
            <p className="mt-3 text-sm leading-relaxed">
              {[a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).map((l, i) => <span key={i} className="block">{l}</span>)}
            </p>
            <p className="mt-3 text-xs text-[var(--color-stone)]">{order.customer_id ? 'Has an account' : 'Ordered as a guest'} · language {order.locale.toUpperCase()}</p>
          </Card>
          <Card title="Payment">
            <p className="text-sm">Placed {formatDate(order.created_at, 'en', true)}</p>
            {order.paid_at && <p className="text-sm">Paid {formatDate(order.paid_at, 'en', true)}{order.payment_method && <> by {order.payment_method}</>}</p>}
            {order.invoice_number && (
              <p className="mt-3 text-sm">
                Invoice {order.invoice_number} ·{' '}
                <button onClick={downloadInvoice} className="underline underline-offset-4">Download PDF</button>
              </p>
            )}
            {order.stripe_payment_intent && (
              <a href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent}`} target="_blank" rel="noreferrer" className="mt-3 block text-sm underline underline-offset-4">
                Open in Stripe ↗
              </a>
            )}
          </Card>
          <Card title="Status">
            <p className="mb-3 text-xs text-[var(--color-stone)]">Refunds are made in Stripe; then set the status here so the client sees it.</p>
            <div className="flex flex-wrap gap-2">
              {(['processing', 'shipped', 'delivered', 'refunded', 'cancelled'] as OrderStatus[])
                .filter((s) => s !== order.status && order.status !== 'pending')
                .map((s) => (
                  <Button key={s} disabled={busy} onClick={async () => (await askConfirm(`Set this order to “${STATUS_LABEL[s]}”?`)) && setStatus(s)}>
                    {STATUS_LABEL[s]}
                  </Button>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
