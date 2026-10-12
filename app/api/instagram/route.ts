import { revalidatePath, revalidateTag } from 'next/cache';
import { CONTENT_TAG } from '@/lib/data';
import { NextResponse } from 'next/server';
import { connectInstagram, disconnectInstagram, instagramStatus, syncInstagram } from '@/lib/instagram';
import { requireAdmin } from '@/lib/server-auth';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Instagram actions for the admin: status, connect, sync, disconnect.
 *
 * GET is the daily Vercel Cron job (see vercel.json); Vercel sends
 * CRON_SECRET as a bearer token. POST is the admin, signed in.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }
  try {
    const synced = await syncInstagram(getServiceDb());
    revalidateTag(CONTENT_TAG);
    revalidatePath('/', 'layout');
    return NextResponse.json({ synced });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; token?: string };

  try {
    const db = getServiceDb();
    switch (body.action) {
      case 'status':
        return NextResponse.json(await instagramStatus(db));
      case 'connect': {
        if (!body.token?.trim()) return NextResponse.json({ error: 'Paste an access token first.' }, { status: 400 });
        const result = await connectInstagram(db, body.token.trim());
        const synced = await syncInstagram(db).catch(() => 0);
        revalidateTag(CONTENT_TAG);
        revalidatePath('/', 'layout');
        return NextResponse.json({ ...result, synced });
      }
      case 'sync': {
        const synced = await syncInstagram(db);
        revalidateTag(CONTENT_TAG);
        revalidatePath('/', 'layout');
        return NextResponse.json({ synced });
      }
      case 'disconnect':
        await disconnectInstagram(db);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
