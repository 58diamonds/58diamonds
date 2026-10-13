import { NextResponse } from 'next/server';
import { cancelBooking, getBooking } from '@/lib/booking-flow';

export const dynamic = 'force-dynamic';

/** The client cancels from the link in their confirmation email. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string; token?: string };
  const booking = await getBooking(String(b.id ?? ''));
  if (!booking || b.token !== booking.client_token) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return (await cancelBooking(booking)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'gone' }, { status: 409 });
}
