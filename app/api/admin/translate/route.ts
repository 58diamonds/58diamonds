import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { TRANSLATION_READY, translate, type Lang } from '@/lib/translate';

export const dynamic = 'force-dynamic';

const LANGS: Lang[] = ['en', 'nl', 'fr'];

/** Text in one of the site's languages in, the other two out, for the admin to check and edit. */
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  if (!TRANSLATION_READY) return NextResponse.json({ error: 'Translation is not set up yet.' }, { status: 503 });
  const { text, from } = (await req.json().catch(() => ({}))) as { text?: string; from?: Lang };
  if (!from || !LANGS.includes(from)) return NextResponse.json({ error: 'Unknown language.' }, { status: 400 });
  if (!text?.trim()) return NextResponse.json({ error: 'There is no text to translate.' }, { status: 400 });
  if (text.length > 20000) return NextResponse.json({ error: 'The text is too long to translate at once.' }, { status: 400 });
  try {
    const targets = LANGS.filter((l) => l !== from);
    const out = await Promise.all(targets.map((to) => translate(text, from, to)));
    return NextResponse.json(Object.fromEntries(targets.map((l, i) => [l, out[i]])));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Translation failed.' }, { status: 502 });
  }
}
