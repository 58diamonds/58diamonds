import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/config';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** The unsubscribe link in each newsletter: /api/newsletter/unsubscribe?token=... */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  let locale = 'en';
  if (/^[0-9a-f-]{36}$/i.test(token)) {
    const { data } = await getServiceDb()
      .from('newsletter_subscribers')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('unsubscribe_token', token)
      .select('locale')
      .maybeSingle();
    if (data?.locale) locale = data.locale;
  }
  return NextResponse.redirect(`${SITE_URL}/${locale}/newsletter/unsubscribed`);
}
