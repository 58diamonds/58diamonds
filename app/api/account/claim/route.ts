import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/server-auth';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * After sign-in: create the client's profile if needed and attach orders they
 * placed as a guest with the same, confirmed, email address.
 */
export async function POST(req: Request) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  const db = getServiceDb();
  const body = (await req.json().catch(() => ({}))) as { name?: string; locale?: string };
  await db
    .from('customers')
    .upsert(
      { user_id: user.id, email: user.email, name: (body.name ?? '').slice(0, 200), locale: ['en', 'nl', 'fr'].includes(body.locale ?? '') ? body.locale : 'en' },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
  let claimed = 0;
  if (user.confirmed && user.email) {
    const { data } = await db
      .from('orders')
      .update({ customer_id: user.id })
      .is('customer_id', null)
      .ilike('email', user.email)
      .neq('status', 'pending')
      .select('id');
    claimed = data?.length ?? 0;
  }
  return NextResponse.json({ ok: true, claimed });
}
