import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/config';
import { PREVIEW_PARAM, previewToken } from '@/lib/preview';
import { requireManager } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/** The private link that shows the whole site while it is hidden from the public. */
export async function POST(req: Request) {
  if (!(await requireManager(req))) return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  const token = await previewToken();
  if (!token) return NextResponse.json({ error: 'The server has no secret key to make a link with.' }, { status: 503 });
  return NextResponse.json({ link: `${SITE_URL}/?${PREVIEW_PARAM}=${token}` });
}
