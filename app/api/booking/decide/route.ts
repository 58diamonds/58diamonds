import { NextResponse } from 'next/server';
import { decideBooking, getBooking, moveBooking } from '@/lib/booking-flow';
import { requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * Farah approves, declines or moves a booking: from the buttons in her email
 * (with the request's secret token) or from the admin (signed in).
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string; token?: string; action?: string; note?: string; start?: number };
  const booking = await getBooking(String(b.id ?? ''));
  if (!booking) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  const byToken = typeof b.token === 'string' && b.token === booking.decision_token;
  if (!byToken && !(await requireAdmin(req))) return NextResponse.json({ error: 'This link is not valid.' }, { status: 403 });
  const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 2000) : null;

  if (b.action === 'move') {
    if (!byToken && typeof b.start === 'number' && Number.isFinite(b.start)) {
      const r = await moveBooking(booking, b.start);
      return NextResponse.json(r, { status: 'error' in r ? 409 : 200 });
    }
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (b.action !== 'approve' && b.action !== 'decline') return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const r = await decideBooking(booking, b.action, note);
  return NextResponse.json(r, { status: 'error' in r ? 409 : 200 });
}
