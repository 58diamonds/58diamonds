import { NextResponse } from 'next/server';
import { passwordProblem } from '@/lib/password';
import { getRequestUser, requireAdmin } from '@/lib/server-auth';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Body =
  | { action: 'create'; username?: string; email?: string; password?: string }
  | { action: 'set-password'; userId?: string; password?: string }
  | { action: 'remove'; userId?: string };

/**
 * Managing admins needs the service key (creating sign-ins, setting another
 * admin's password), so it happens here, for a signed-in admin only.
 */
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  const me = await getRequestUser(req);
  const body = (await req.json().catch(() => ({}))) as Body;
  const db = getServiceDb();
  const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

  if (body.action === 'create') {
    const username = (body.username ?? '').trim().toLowerCase();
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) return fail('Username: 3 to 40 letters, numbers, dots or dashes.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('That email address does not look right.');
    const weak = passwordProblem(password);
    if (weak) return fail(weak);
    const { data: taken } = await db.from('admins').select('user_id').eq('username', username).maybeSingle();
    if (taken) return fail('That username is taken.');
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) return fail(error?.message ?? 'Could not create the sign-in.');
    const { error: rowError } = await db.from('admins').insert({ user_id: data.user.id, username, email });
    if (rowError) {
      await db.auth.admin.deleteUser(data.user.id);
      return fail(rowError.message);
    }
    return NextResponse.json({ ok: true });
  }

  const userId = body.userId ?? '';
  const { data: target } = await db.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (!target) return fail('No such admin.', 404);
  if (userId === me?.id) return fail('You cannot do this for yourself. Ask another admin.');

  if (body.action === 'set-password') {
    const password = (body as { password?: string }).password ?? '';
    const weak = passwordProblem(password);
    if (weak) return fail(weak);
    const { error } = await db.auth.admin.updateUserById(userId, { password });
    if (error) return fail(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'remove') {
    const { count } = await db.from('admins').select('user_id', { count: 'exact', head: true });
    if ((count ?? 0) <= 1) return fail('The last admin cannot be removed.');
    await db.from('admins').delete().eq('user_id', userId);
    await db.auth.admin.deleteUser(userId);
    return NextResponse.json({ ok: true });
  }

  return fail('Unknown action.');
}
