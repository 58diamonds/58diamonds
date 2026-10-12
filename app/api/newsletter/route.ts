import { NextResponse } from 'next/server';
import { HAS_DATABASE, SITE_URL } from '@/lib/config';
import { getSettings } from '@/lib/data';
import { sendEmail } from '@/lib/email';
import { newsletterConfirm } from '@/lib/emails';
import { translatorFor } from '@/lib/orders';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Newsletter signup, with double opt-in: we store the address and email a
 * confirmation link; it only counts once that link is clicked. Always answers
 * the same way, whether the address was new or already on the list, so nobody
 * can test who is subscribed.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { email?: unknown; locale?: unknown; source?: unknown };
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 200) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  if (!HAS_DATABASE) return NextResponse.json({ ok: true });
  const { t, locale } = await translatorFor(typeof b.locale === 'string' ? b.locale : 'en');
  const source = typeof b.source === 'string' ? b.source.replace(/[^a-z-]/g, '').slice(0, 30) || 'website' : 'website';
  const db = getServiceDb();
  const { data: existing } = await db
    .from('newsletter_subscribers')
    .select('id, confirm_token, confirmed_at, unsubscribed_at')
    .eq('email', email)
    .maybeSingle();

  let token: string | null = null;
  if (!existing) {
    const { data } = await db.from('newsletter_subscribers').insert({ email, locale, source }).select('confirm_token').single();
    token = data?.confirm_token ?? null;
  } else if (existing.unsubscribed_at || !existing.confirmed_at) {
    // Coming back, or never confirmed: ask again before anything is sent.
    const { data } = await db
      .from('newsletter_subscribers')
      .update({ unsubscribed_at: null, confirmed_at: null, locale, source, confirm_token: crypto.randomUUID() })
      .eq('id', existing.id)
      .select('confirm_token')
      .single();
    token = data?.confirm_token ?? null;
  }
  if (token) {
    const settings = await getSettings();
    await sendEmail({ to: email, ...newsletterConfirm(`${SITE_URL}/api/newsletter/confirm?token=${token}`, t), replyTo: settings.email });
  }
  return NextResponse.json({ ok: true });
}
