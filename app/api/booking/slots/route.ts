import { NextResponse } from 'next/server';
import { bookingLive, busyTimes, getBookingConfig } from '@/lib/agenda';
import { addDays, appointmentDates, bookingWindow, freeSlots, zonedDate } from '@/lib/booking';

export const dynamic = 'force-dynamic';

/**
 * Free appointment times for one month: /api/booking/slots?month=2026-11.
 * Only start times (and the by-appointment-only dates) leave the server, never
 * anything from Farah's calendar.
 */
export async function GET(req: Request) {
  const cfg = await getBookingConfig();
  if (!bookingLive(cfg)) return NextResponse.json({ live: false });
  const now = Date.now();
  const { from, to } = bookingWindow(cfg, now);
  const first = zonedDate(from);
  const last = zonedDate(to);
  const asked = new URL(req.url).searchParams.get('month') ?? '';
  const month = /^\d{4}-\d{2}$/.test(asked) ? asked : first.slice(0, 7);
  const start = `${month}-01` < first ? first : `${month}-01`;
  const monthEnd = addDays(`${addDays(`${month}-28`, 4).slice(0, 7)}-01`, -1);
  const end = monthEnd > last ? last : monthEnd;
  const days: Record<string, number[]> = {};
  let unverified = false;
  let appointment: string[] = [];
  if (start <= end) {
    appointment = appointmentDates(cfg, start, end, now);
    const range = await busyTimes(cfg, Date.parse(`${addDays(start, -1)}T00:00:00Z`), Date.parse(`${addDays(end, 2)}T00:00:00Z`));
    unverified = range.unverified;
    Object.assign(days, freeSlots(cfg, range.busy, start, end, now));
  }
  return NextResponse.json(
    { live: true, month, first: first.slice(0, 7), last: last.slice(0, 7), duration: cfg.duration_min, unverified, days, appointment },
    { headers: { 'cache-control': 'no-store' } },
  );
}
