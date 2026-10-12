import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { CONTENT_TAG } from '@/lib/data';
import { requireAdmin } from '@/lib/server-auth';

/** The admin calls this after a save so the public pages refresh straight away. */
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  revalidateTag(CONTENT_TAG);
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true });
}
