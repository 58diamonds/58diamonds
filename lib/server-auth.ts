import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { isRole, type AdminRole } from './roles';

/**
 * Is the bearer token on this request a signed-in admin?
 *
 * Asks the database itself, as that user, so the answer comes from the same
 * is_admin() the row-level security uses.
 */
export async function requireAdmin(req: Request): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL) return false;
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await db.rpc('is_admin');
  return !error && data === true;
}

/** The role of the signed-in admin behind this request, or null (not an admin, or blocked). */
export async function getAdminRole(req: Request): Promise<AdminRole | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL) return null;
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await db.rpc('admin_role');
  return !error && isRole(data) ? data : null;
}

/** An owner or admin: orders, clients, requests, agenda, booking and settings. */
export async function requireManager(req: Request): Promise<boolean> {
  const role = await getAdminRole(req);
  return role === 'owner' || role === 'admin';
}

/** The signed-in client behind a request's bearer token, if any. */
export async function getRequestUser(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL) return null;
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? '', confirmed: Boolean(data.user.email_confirmed_at) };
}
