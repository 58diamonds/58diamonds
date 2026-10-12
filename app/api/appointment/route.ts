import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/data';
import { adminAddress, sendEmail } from '@/lib/email';
import { adminNewRequest } from '@/lib/emails';
import { isLocale } from '@/lib/i18n';
import { getServiceDb } from '@/lib/supabase';
import { HAS_DATABASE } from '@/lib/config';

export const dynamic = 'force-dynamic';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** The appointment form: stored for the admin's Requests page, and emailed to Farah. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = str(b.name, 200);
  const email = str(b.email, 200) || null;
  const phone = str(b.phone, 50) || null;
  const piece = str(b.piece, 200);
  const message = (piece ? `About: ${piece}\n\n` : '') + str(b.message, 3500);
  if (!name || (!email && !phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const row = { name, email, phone, preferred_date: str(b.preferred_date, 100) || null, message, locale: isLocale(b.locale) ? b.locale : 'en' };
  if (!HAS_DATABASE) return NextResponse.json({ ok: true });
  const { error } = await getServiceDb().from('appointment_requests').insert(row);
  if (error) return NextResponse.json({ error: 'failed' }, { status: 500 });
  const settings = await getSettings();
  const to = adminAddress(settings.email);
  if (to) await sendEmail({ to, ...adminNewRequest(row), replyTo: email });
  return NextResponse.json({ ok: true });
}
