import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/config';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** The link in the confirmation email: /api/newsletter/confirm?token=... Records when consent was given. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  let locale = 'en';
  if (/^[0-9a-f-]{36}$/i.test(token)) {
    const db = getServiceDb();
    const { data } = await db.from('newsletter_subscribers').select('id, locale, confirmed_at').eq('confirm_token', token).maybeSingle();
    if (data) {
      locale = data.locale;
      if (!data.confirmed_at) await db.from('newsletter_subscribers').update({ confirmed_at: new Date().toISOString(), unsubscribed_at: null }).eq('id', data.id);
    }
  }
  return NextResponse.redirect(`${SITE_URL}/${locale}/newsletter/confirmed`);
}
