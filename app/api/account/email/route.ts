import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/config';
import { getSettings } from '@/lib/data';
import { sendEmail } from '@/lib/email';
import { accountEmail } from '@/lib/emails';
import { translatorFor } from '@/lib/orders';
import { href } from '@/lib/routes';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Client account emails in the shop's own style, sent through our mailer
 * instead of the database's plain default ones: "confirm your email" after
 * creating an account, and "choose a new password". The link goes to the
 * account page on this site, which finishes the step itself.
 * A reset answers the same way whether the account exists or not.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { kind?: unknown; email?: unknown; password?: unknown; name?: unknown; locale?: unknown };
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 200) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const { t, locale } = await translatorFor(typeof b.locale === 'string' ? b.locale : 'en');
  const db = getServiceDb();
  const page = `${SITE_URL}${href.account(locale)}`;

  if (b.kind === 'reset') {
    const { data, error } = await db.auth.admin.generateLink({ type: 'recovery', email });
    if (!error && data.properties?.hashed_token) {
      const settings = await getSettings();
      await sendEmail({ to: email, replyTo: settings.email, ...accountEmail('reset', `${page}?reset=${data.properties.hashed_token}`, t) });
    }
    return NextResponse.json({ ok: true });
  }

  if (b.kind === 'sign-up') {
    const password = typeof b.password === 'string' ? b.password : '';
    if (password.length < 8) return NextResponse.json({ error: t('account.password_hint') }, { status: 400 });
    const name = typeof b.name === 'string' ? b.name.trim().slice(0, 200) : '';
    const { data, error } = await db.auth.admin.generateLink({ type: 'signup', email, password, options: { data: { name, locale } } });
    if (error || !data.properties?.hashed_token) {
      const taken = /already|registered|exists/i.test(error?.message ?? '');
      return NextResponse.json({ error: taken ? t('account.exists') : error?.message ?? 'error' }, { status: 400 });
    }
    const settings = await getSettings();
    const sent = await sendEmail({ to: email, replyTo: settings.email, ...accountEmail('welcome', `${page}?confirm=${data.properties.hashed_token}`, t) });
    return sent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'email' }, { status: 502 });
  }

  return NextResponse.json({ error: 'invalid' }, { status: 400 });
}
