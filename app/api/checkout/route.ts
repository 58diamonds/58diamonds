import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { priceBag, type BagLine } from '@/lib/checkout';
import { SITE_URL } from '@/lib/config';
import { getSettings, getTexts } from '@/lib/data';
import { isLocale, type Locale } from '@/lib/i18n';
import { reservedStock } from '@/lib/orders';
import { href } from '@/lib/routes';
import { getRequestUser } from '@/lib/server-auth';
import { getStripe, toCents } from '@/lib/stripe';
import { getServiceDb } from '@/lib/supabase';
import { makeT } from '@/lib/t';
import type { Piece, Section } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Stripe Checkout languages for ours. */
const STRIPE_LOCALE: Record<Locale, 'en' | 'nl' | 'fr'> = { en: 'en', nl: 'nl', fr: 'fr' };

/**
 * Start a payment: check the bag against live stock and prices, write a
 * pending order, and hand back the Stripe Checkout address. The order holds
 * its pieces for 30 minutes, the life of the Stripe page.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    lines?: BagLine[];
    locale?: string;
    giftWrap?: boolean;
    giftMessage?: string;
    acceptTerms?: boolean;
  } | null;
  const locale: Locale = isLocale(body?.locale) ? body.locale : 'en';
  const bag = Array.isArray(body?.lines) ? body.lines.slice(0, 30) : [];
  if (!bag.length) return NextResponse.json({ error: 'empty' }, { status: 400 });
  // The buyer must have seen the terms, the withdrawal right and its exceptions.
  if (body?.acceptTerms !== true) return NextResponse.json({ error: 'terms' }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const db = getServiceDb();
  const ids = [...new Set(bag.map((l) => String(l.pieceId)))].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const [{ data: pieces }, { data: sections }, settings, reserved, user] = await Promise.all([
    db.from('pieces').select('*, piece_images(*), piece_variants(*)').in('id', ids).eq('visible', true),
    db.from('sections').select('*').eq('visible', true),
    getSettings(),
    reservedStock(),
    getRequestUser(req),
  ]);
  const visibleSections = (sections ?? []) as Section[];
  const live = ((pieces ?? []) as Piece[])
    .filter((p) => !p.section_id || visibleSections.some((s) => s.id === p.section_id))
    .map((p) => ({ ...p, piece_images: [...p.piece_images].sort((a, b) => a.position - b.position) }));

  if (!settings.shop_enabled) return NextResponse.json({ error: 'closed' }, { status: 409 });

  const giftMessage = (body?.giftMessage ?? '').toString().trim().slice(0, 300) || null;
  const priced = priceBag(bag, live, visibleSections, settings, reserved, { giftWrap: Boolean(body?.giftWrap), locale });
  if (priced.problems.length || !priced.lines.length) {
    return NextResponse.json({ error: 'unavailable', fixed: priced.fixed }, { status: 409 });
  }

  if (user) {
    await db.from('customers').upsert({ user_id: user.id, email: user.email, locale }, { onConflict: 'user_id', ignoreDuplicates: true });
  }

  const { data: order, error } = await db
    .from('orders')
    .insert({
      customer_id: user?.id ?? null,
      email: user?.email ?? '',
      locale,
      currency: settings.currency,
      subtotal: priced.subtotal,
      shipping: priced.shipping,
      total: priced.total,
      gift_wrap: Boolean(body?.giftWrap) && settings.gift_wrap_enabled,
      gift_message: settings.gift_wrap_enabled ? giftMessage : null,
      terms_accepted_at: new Date().toISOString(),
    })
    .select('id, number')
    .single();
  if (error || !order) return NextResponse.json({ error: 'failed' }, { status: 500 });

  const items = priced.lines.map((l) => ({
    order_id: order.id,
    piece_id: l.piece.id,
    variant_id: l.variantId,
    title: l.title,
    variant: l.variantLabel,
    image_url: l.image,
    unit_price: l.unitPrice,
    quantity: l.quantity,
  }));
  const { error: itemsError } = await db.from('order_items').insert(items);
  if (itemsError) {
    await db.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const currency = settings.currency.toLowerCase();
  const abs = (u: string | null) => (u ? new URL(u, SITE_URL).toString() : null);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: STRIPE_LOCALE[locale],
      client_reference_id: order.id,
      metadata: { order_id: order.id, order_number: String(order.number) },
      payment_intent_data: { metadata: { order_id: order.id, order_number: String(order.number) } },
      customer_email: user?.email || undefined,
      customer_creation: 'if_required',
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      // Business buyers can add their VAT number; it goes on the invoice.
      tax_id_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: settings.ship_to as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: makeT(await getTexts(), locale)('cart.shipping'),
            fixed_amount: { amount: toCents(priced.shipping), currency },
          },
        },
      ],
      line_items: [
        ...priced.lines.map((l) => ({
          quantity: l.quantity,
          price_data: {
            currency,
            unit_amount: toCents(l.unitPrice),
            product_data: {
              name: l.variantLabel ? `${l.title} (${l.variantLabel})` : l.title,
              images: l.image && !l.image.startsWith('/') ? [abs(l.image)!] : undefined,
              metadata: { piece_id: l.piece.id },
            },
          },
        })),
        ...(priced.giftWrap > 0
          ? [{ quantity: 1, price_data: { currency, unit_amount: toCents(priced.giftWrap), product_data: { name: makeT(await getTexts(), locale)('invoice.gift_wrap') } } }]
          : []),
      ],
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${SITE_URL}/${locale}/checkout/success?order=${order.id}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}${href.bag(locale)}?cancelled=1`,
    });
    await db.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout failed:', e);
    await db.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
    return NextResponse.json({ error: 'failed' }, { status: 502 });
  }
}
