import { NextResponse } from 'next/server';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * For the thank-you page: the order number and status of the order just paid.
 * Needs both the order id and its Stripe session id, so it cannot be guessed.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('order') ?? '';
  const session = url.searchParams.get('session') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id) || !session.startsWith('cs_')) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const { data } = await getServiceDb()
    .from('orders')
    .select('number, status')
    .eq('id', id)
    .eq('stripe_session_id', session)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json(data);
}
