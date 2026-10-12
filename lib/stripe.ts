import 'server-only';
import Stripe from 'stripe';

let client: Stripe | null = null;

/** Stripe, or null while no key is set (preview), in which case checkout says payments are not on yet. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

export const toCents = (amount: number) => Math.round(Number(amount) * 100);
