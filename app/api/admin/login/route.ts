import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Admin sign-in: username and password. The username is looked up here, on
 * the server, so admin email addresses never reach the browser.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { username?: unknown; password?: unknown };
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const fail = () => NextResponse.json({ error: 'That username and password do not match.' }, { status: 401 });
  if (!username || !password || !SUPABASE_URL) return fail();

  const service = getServiceDb();
  const { data: admin } = await service.from('admins').select('user_id, blocked').eq('username', username).maybeSingle();
  // The sign-in email lives with the sign-in itself; an admin may have no email of their own.
  const signIn = admin && !admin.blocked ? (await service.auth.admin.getUserById(admin.user_id)).data.user?.email : undefined;
  // Same answer and similar work whether or not the username exists.
  const email = signIn ?? `nobody-${crypto.randomUUID()}@invalid.example`;
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.session || !signIn) return fail();
  return NextResponse.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
}
