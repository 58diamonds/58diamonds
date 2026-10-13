import { NextResponse } from 'next/server';
import { loadOrder, renderInvoice } from '@/lib/orders';
import { getRequestUser, requireManager } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/** The invoice PDF of a paid order, for its client or an admin. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const [order, user, admin] = await Promise.all([loadOrder(id), getRequestUser(req), requireManager(req)]);
  if (!order || !order.invoice_number) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (!admin && (!user || order.customer_id !== user.id)) return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  const pdf = await renderInvoice(order);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="invoice-${order.invoice_number}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
