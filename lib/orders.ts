import 'server-only';
import type Stripe from 'stripe';
import { getSettings, getTexts } from './data';
import { adminAddress, sendEmail } from './email';
import { adminNewOrder, orderConfirmation, orderShipped } from './emails';
import { isLocale, type Locale } from './i18n';
import { invoicePdf } from './invoice';
import { getServiceDb } from './supabase';
import { makeT } from './t';
import type { Address, Order, OrderItem } from './types';

/** Order work done on the server with full rights: after payment, on shipping, for invoices. */

export async function loadOrder(id: string): Promise<(Order & { order_items: OrderItem[] }) | null> {
  const { data } = await getServiceDb().from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
  if (!data) return null;
  const o = data as Order & { order_items: OrderItem[] };
  const num = (n: unknown) => Number(n);
  return {
    ...o,
    subtotal: num(o.subtotal),
    shipping: num(o.shipping),
    tax: num(o.tax),
    total: num(o.total),
    order_items: o.order_items.map((i) => ({ ...i, unit_price: num(i.unit_price) })),
  };
}

export async function translatorFor(locale: string) {
  const l: Locale = isLocale(locale) ? locale : 'en';
  return { locale: l, t: makeT(await getTexts(), l) };
}

export async function renderInvoice(order: Order & { order_items: OrderItem[] }) {
  const [{ t, locale }, settings] = await Promise.all([translatorFor(order.locale), getSettings()]);
  return invoicePdf(order, order.order_items, settings, t, locale);
}

function addressFrom(a: Stripe.Address | null | undefined): Address {
  if (!a) return {};
  return {
    line1: a.line1 ?? undefined,
    line2: a.line2 ?? undefined,
    postal_code: a.postal_code ?? undefined,
    city: a.city ?? undefined,
    country: a.country ?? undefined,
  };
}

/**
 * A Checkout Session was paid: store who and where, mark the order paid
 * (stock and invoice number, once), then send the emails. Safe to run twice.
 */
export async function completePaidSession(session: Stripe.Checkout.Session, paymentMethod: string | null) {
  const orderId = session.metadata?.order_id || session.client_reference_id;
  if (!orderId) throw new Error(`Session ${session.id} has no order.`);
  const db = getServiceDb();
  const shipping = session.collected_information?.shipping_details;
  const details = session.customer_details;
  await db
    .from('orders')
    .update({
      email: details?.email ?? undefined,
      name: shipping?.name || details?.name || undefined,
      phone: details?.phone ?? undefined,
      shipping_address: addressFrom(shipping?.address ?? details?.address),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending');

  const { data, error } = await db.rpc('mark_order_paid', {
    p_order: orderId,
    p_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    p_method: paymentMethod,
  });
  if (error) throw new Error(error.message);
  const result = (Array.isArray(data) ? data[0] : data) as { already_paid: boolean; oversold: boolean };
  if (result.already_paid) return;

  const order = await loadOrder(orderId);
  if (!order) return;
  const [{ t, locale }, settings] = await Promise.all([translatorFor(order.locale), getSettings()]);
  const pdf = await invoicePdf(order, order.order_items, settings, t, locale);
  const mail = orderConfirmation(order, order.order_items, t, locale);
  await sendEmail({
    to: order.email,
    ...mail,
    replyTo: settings.email,
    attachments: [{ filename: `invoice-${order.invoice_number ?? order.number}.pdf`, content: pdf }],
  });
  const admin = adminAddress(settings.email);
  if (admin) await sendEmail({ to: admin, ...adminNewOrder(order, order.order_items, result.oversold) });
}

/** The checkout was abandoned or the payment failed: release what it was holding. */
export async function cancelPendingOrder(orderId: string) {
  await getServiceDb()
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'pending');
}

export async function sendShippedEmail(orderId: string) {
  const order = await loadOrder(orderId);
  if (!order) return false;
  const [{ t, locale }, settings] = await Promise.all([translatorFor(order.locale), getSettings()]);
  return sendEmail({ to: order.email, ...orderShipped(order, t, locale), replyTo: settings.email });
}

/** What checkouts in progress are holding (last 31 minutes), per variant or piece. */
export async function reservedStock(): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 31 * 60 * 1000).toISOString();
  const { data } = await getServiceDb()
    .from('order_items')
    .select('piece_id, variant_id, quantity, orders!inner(status, created_at)')
    .eq('orders.status', 'pending')
    .gte('orders.created_at', since);
  const out = new Map<string, number>();
  for (const r of (data ?? []) as { piece_id: string | null; variant_id: string | null; quantity: number }[]) {
    const key = r.variant_id ?? r.piece_id;
    if (key) out.set(key, (out.get(key) ?? 0) + r.quantity);
  }
  return out;
}
