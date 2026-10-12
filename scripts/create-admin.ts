/**
 * Creates the first admin, before anyone can sign in to /admin.
 * Later admins are added from Admin > Admins and security.
 *
 *   npm run create-admin -- <username> <email> <password>
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (for example: node --env-file=.env.local).
 */
import { createClient } from '@supabase/supabase-js';
import { passwordProblem } from '../lib/password';

const [username, email, password] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  if (!username || !email || !password) throw new Error('Usage: npm run create-admin -- <username> <email> <password>');
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error('Username: 3 to 40 small letters, numbers, dots or dashes.');
  const weak = passwordProblem(password);
  if (weak) throw new Error(weak);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message ?? 'Could not create the user.');
  const { error: rowError } = await db.from('admins').insert({ user_id: data.user.id, username, email: email.toLowerCase() });
  if (rowError) {
    await db.auth.admin.deleteUser(data.user.id);
    throw new Error(rowError.message);
  }
  console.log(`Admin "${username}" created. Sign in at /admin with the username and password.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
