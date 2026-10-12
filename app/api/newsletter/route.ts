import { NextResponse } from 'next/server';
import { HAS_DATABASE } from '@/lib/config';
import { isLocale } from '@/lib/i18n';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Newsletter signup. Always answers the same way, whether the address was new
 * or already on the list, so nobody can test who is subscribed.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { email?: unknown; locale?: unknown };
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 200) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  if (!HAS_DATABASE) return NextResponse.json({ ok: true });
  const db = getServiceDb();
  const { data: existing } = await db.from('newsletter_subscribers').select('id, unsubscribed_at').eq('email', email).maybeSingle();
  if (!existing) {
    await db.from('newsletter_subscribers').insert({ email, locale: isLocale(b.locale) ? b.locale : 'en' });
  } else if (existing.unsubscribed_at) {
    await db.from('newsletter_subscribers').update({ unsubscribed_at: null }).eq('id', existing.id);
  }
  return NextResponse.json({ ok: true });
}
