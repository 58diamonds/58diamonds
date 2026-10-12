import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { cancelPendingOrder, completePaidSession } from '@/lib/orders';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * Stripe tells us here when a checkout is paid, fails or expires. Set it up in
 * Stripe > Developers > Webhooks with these events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, checkout.session.expired
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        // Bank payments can complete before the money arrives; those come back as async_payment_succeeded.
        if (session.payment_status !== 'paid') break;
        await completePaidSession(session, await methodOf(stripe, session));
        break;
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const id = event.data.object.metadata?.order_id;
        if (id) await cancelPendingOrder(id);
        break;
      }
    }
  } catch (e) {
    console.error('Webhook handling failed:', e);
    // Stripe retries on errors, and completing an order is safe to repeat.
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

/** "card", "bancontact", "ideal", "paypal"... plus the wallet for Apple Pay and Google Pay. */
async function methodOf(stripe: Stripe, session: Stripe.Checkout.Session): Promise<string | null> {
  const id = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!id) return null;
  try {
    const pi = await stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] });
    const details = typeof pi.latest_charge === 'object' ? pi.latest_charge?.payment_method_details : null;
    if (!details) return pi.payment_method_types[0] ?? null;
    const wallet = details.type === 'card' ? details.card?.wallet?.type : null;
    return wallet ? wallet.replace('_', ' ') : details.type;
  } catch {
    return null;
  }
}
