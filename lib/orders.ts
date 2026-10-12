import 'server-only';
import type Stripe from 'stripe';
import { getPage, getSettings, getTexts } from './data';
import { adminAddress, sendEmail } from './email';
import { adminNewOrder, orderConfirmation, orderShipped } from './emails';
import { fill, isLocale, tr, type Locale } from './i18n';
import { invoicePdf } from './invoice';
import { pageVars } from './site';
import { getServiceDb } from './supabase';
import { makeT } from './t';
import { HOME_COUNTRY, vatForSale } from './vat';
import { vatIncluded } from './shop';
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
    vat_rate: o.vat_rate == null ? null : num(o.vat_rate),
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
  const address = addressFrom(shipping?.address ?? details?.address);
  const vat = await vatForOrder(orderId, address.country);
  await db
    .from('orders')
    .update({
      email: details?.email ?? undefined,
      name: shipping?.name || details?.name || undefined,
      phone: details?.phone ?? undefined,
      shipping_address: address,
      billing_address: addressFrom(details?.address),
      buyer_vat: details?.tax_ids?.[0]?.value ?? null,
      ...vat,
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
  const [{ t, locale }, settings, form] = await Promise.all([translatorFor(order.locale), getSettings(), getPage('withdrawal')]);
  const pdf = await invoicePdf(order, order.order_items, settings, t, locale);
  const vars = pageVars(settings);
  const mail = orderConfirmation(order, order.order_items, t, locale, {
    email: vars.email,
    withdrawalForm: form ? fill(tr(form.body, locale), vars) : '',
  });
  await sendEmail({
    to: order.email,
    ...mail,
    replyTo: settings.email,
    attachments: [{ filename: `invoice-${order.invoice_number ?? order.number}.pdf`, content: pdf }],
  });
  const admin = adminAddress(settings.email);
  if (admin) await sendEmail({ to: admin, ...adminNewOrder(order, order.order_items, result.oversold) });
}

/**
 * The VAT a pending order is sold with, from the country it ships to and the
 * year's sales to private buyers in other EU countries (lib/vat.ts).
 */
async function vatForOrder(orderId: string, country: string | undefined) {
  const db = getServiceDb();
  const [{ data: order }, settings] = await Promise.all([
    db.from('orders').select('total, status').eq('id', orderId).maybeSingle(),
    getSettings(),
  ]);
  if (!order || order.status !== 'pending') return {};
  const year = new Date().getUTCFullYear();
  const [soldThisYear, soldLastYear] = await Promise.all([euSalesNet(year), euSalesNet(year - 1)]);
  const gross = Number(order.total);
  const choice = vatForSale({
    country,
    gross,
    soldThisYear,
    soldLastYear,
    ossRegistered: settings.oss_registered,
    homeRate: Number(settings.vat_rate),
    overrides: settings.eu_vat_rates,
  });
  return { vat_rate: choice.rate, vat_country: choice.country, vat_scheme: choice.scheme, tax: vatIncluded(gross, choice.rate) };
}

/** Net sales (VAT out) to private buyers in other EU countries, in one calendar year. */
export async function euSalesNet(year: number): Promise<number> {
  const { data } = await getServiceDb()
    .from('orders')
    .select('total, tax')
    .in('status', ['paid', 'processing', 'shipped', 'delivered'])
    .in('vat_scheme', ['belgium', 'oss'])
    .neq('vat_country', HOME_COUNTRY)
    .gte('paid_at', `${year}-01-01T00:00:00Z`)
    .lt('paid_at', `${year + 1}-01-01T00:00:00Z`);
  return Math.round((data ?? []).reduce((sum, o) => sum + Number(o.total) - Number(o.tax), 0) * 100) / 100;
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
