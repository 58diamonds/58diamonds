import { NextResponse } from 'next/server';
import { sendShippedEmail } from '@/lib/orders';
import { requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/** Sends the "your order is on its way" email with the tracking link. */
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
  if (!orderId) return NextResponse.json({ error: 'No order.' }, { status: 400 });
  const sent = await sendShippedEmail(orderId);
  return NextResponse.json({ sent });
}
