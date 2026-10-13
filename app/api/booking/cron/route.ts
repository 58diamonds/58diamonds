import { NextResponse } from 'next/server';
import { getBookingConfig } from '@/lib/agenda';
import { addDays, zonedDate } from '@/lib/booking';
import { bookingLocale, bookingPlace, bookingT, cancelLink, decideBooking, decideLink, type BookingRow } from '@/lib/booking-flow';
import { getSettings } from '@/lib/data';
import { adminAddress, sendEmail } from '@/lib/email';
import { adminNewBooking, bookingReminder } from '@/lib/emails';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Daily (vercel.json): reminds clients of tomorrow's appointments, reminds
 * Farah once of requests waiting more than 48 hours, and frees holds past the
 * auto-release time set in the admin. Vercel sends CRON_SECRET as a bearer token.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }
  const db = getServiceDb();
  const cfg = await getBookingConfig();
  const now = Date.now();
  const tomorrow = addDays(zonedDate(now), 1);
  const done = { clients: 0, farah: 0, released: 0 };

  // Clients: confirmed appointments tomorrow.
  const { data: soon } = await db
    .from('appointment_requests')
    .select('*')
    .eq('status', 'confirmed')
    .is('client_reminded_at', null)
    .gt('starts_at', new Date(now).toISOString())
    .lt('starts_at', new Date(now + 3 * 86400_000).toISOString());
  for (const b of (soon ?? []) as BookingRow[]) {
    if (zonedDate(Date.parse(b.starts_at)) !== tomorrow || !b.email) continue;
    const ok = await sendEmail({ to: b.email, ...bookingReminder(b, await bookingT(b.locale), bookingLocale(b.locale), await bookingPlace(), cancelLink(b)) });
    if (ok) {
      await db.from('appointment_requests').update({ client_reminded_at: new Date().toISOString() }).eq('id', b.id);
      done.clients++;
    }
  }

  // Farah: requests still waiting.
  const { data: waiting } = await db.from('appointment_requests').select('*, created_at').eq('status', 'pending');
  const to = adminAddress((await getSettings()).email);
  for (const b of (waiting ?? []) as (BookingRow & { created_at: string; farah_reminded_at: string | null })[]) {
    const age = now - Date.parse(b.created_at);
    if (cfg.auto_release_hours && age > cfg.auto_release_hours * 3600_000) {
      await decideBooking(b, 'decline', null);
      done.released++;
    } else if (age > 48 * 3600_000 && !b.farah_reminded_at && to) {
      await sendEmail({ to, ...adminNewBooking(b, decideLink(b), true), replyTo: b.email });
      await db.from('appointment_requests').update({ farah_reminded_at: new Date().toISOString() }).eq('id', b.id);
      done.farah++;
    }
  }
  return NextResponse.json(done);
}
