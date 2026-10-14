import { NextResponse } from 'next/server';
import { passwordProblem } from '@/lib/password';
import { canManage, canSetPassword, isRole, ROLE_LABEL, type AdminRole } from '@/lib/roles';
import { getAdminRole, getRequestUser } from '@/lib/server-auth';
import { getServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Body =
  | { action: 'create'; username?: string; email?: string; password?: string; role?: string }
  | { action: 'set-password'; userId?: string; password?: string }
  | { action: 'set-role'; userId?: string; role?: string }
  | { action: 'block' | 'unblock' | 'remove'; userId?: string };

/** Sign-ins need an email address; someone added without one gets a private one nobody writes to. */
function placeholderEmail() {
  return `admin-${crypto.randomUUID()}@no-email.58diamonds.com`;
}

/**
 * Managing admins needs the service key (creating sign-ins, setting another
 * admin's password), so it happens here. Owners manage everyone, admins
 * manage admins and editors, editors nobody.
 */
export async function POST(req: Request) {
  const role = await getAdminRole(req);
  if (role !== 'owner' && role !== 'admin') return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  const me = await getRequestUser(req);
  const body = (await req.json().catch(() => ({}))) as Body;
  const db = getServiceDb();
  const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
  const owners = async () => (await db.from('admins').select('user_id', { count: 'exact', head: true }).eq('role', 'owner').eq('blocked', false)).count ?? 0;

  if (body.action === 'create') {
    const username = (body.username ?? '').trim().toLowerCase();
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
    const newRole: AdminRole = isRole(body.role) ? body.role : 'editor';
    if (!canManage(role, newRole)) return fail(`Only an owner can add an ${ROLE_LABEL[newRole].toLowerCase()}.`, 403);
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) return fail('Username: 3 to 40 letters, numbers, dots or dashes.');
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('That email address does not look right. Leave it empty if there is none.');
    const weak = passwordProblem(password);
    if (weak) return fail(weak);
    const { data: taken } = await db.from('admins').select('user_id').eq('username', username).maybeSingle();
    if (taken) return fail('That username is taken.');
    const { data, error } = await db.auth.admin.createUser({ email: email || placeholderEmail(), password, email_confirm: true });
    if (error || !data.user) return fail(error?.message ?? 'Could not create the sign-in.');
    const { error: rowError } = await db.from('admins').insert({ user_id: data.user.id, username, email: email || null, role: newRole });
    if (rowError) {
      await db.auth.admin.deleteUser(data.user.id);
      return fail(rowError.message);
    }
    return NextResponse.json({ ok: true });
  }

  const userId = body.userId ?? '';
  const { data: target } = await db.from('admins').select('user_id, role, blocked').eq('user_id', userId).maybeSingle();
  if (!target) return fail('No such admin.', 404);
  if (userId === me?.id) return fail('You cannot do this for yourself. Ask another admin.');
  const targetRole: AdminRole = isRole(target.role) ? target.role : 'editor';
  const allowed = body.action === 'set-password' ? canSetPassword(role, targetRole) : canManage(role, targetRole);
  if (!allowed) return fail('Only an owner can change an owner.', 403);
  const lastOwner = targetRole === 'owner' && !target.blocked && (await owners()) <= 1;

  if (body.action === 'set-password') {
    const password = body.password ?? '';
    const weak = passwordProblem(password);
    if (weak) return fail(weak);
    const { error } = await db.auth.admin.updateUserById(userId, { password });
    if (error) return fail(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'set-role') {
    if (!isRole(body.role)) return fail('Unknown role.');
    if (!canManage(role, body.role)) return fail('Only an owner can make someone an owner.', 403);
    if (lastOwner && body.role !== 'owner') return fail('There must always be an owner.');
    const { error } = await db.from('admins').update({ role: body.role }).eq('user_id', userId);
    if (error) return fail(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'block' || body.action === 'unblock') {
    const blocked = body.action === 'block';
    if (blocked && lastOwner) return fail('The last owner cannot be blocked.');
    const { error } = await db.from('admins').update({ blocked }).eq('user_id', userId);
    if (error) return fail(error.message, 500);
    // A ban also ends any session they have open now.
    await db.auth.admin.updateUserById(userId, { ban_duration: blocked ? '876000h' : 'none' });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'remove') {
    if (lastOwner) return fail('The last owner cannot be removed.');
    await db.from('admins').delete().eq('user_id', userId);
    await db.auth.admin.deleteUser(userId);
    return NextResponse.json({ ok: true });
  }

  return fail('Unknown action.');
}
