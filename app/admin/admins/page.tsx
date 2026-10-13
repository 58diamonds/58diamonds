'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminRole } from '@/components/admin/AdminShell';
import { Badge, Button, Card, Help, Loading, PageTitle, SelectField, TextField } from '@/components/admin/ui';
import { adminFetch } from '@/lib/admin-client';
import { PASSWORD_RULE, passwordProblem } from '@/lib/password';
import { canManage, isRole, ROLE_HELP, ROLE_LABEL, ROLES, type AdminRole } from '@/lib/roles';
import { getAdminDb } from '@/lib/supabase';
import { askConfirm } from '@/components/admin/confirm';

interface Admin {
  user_id: string;
  username: string;
  email: string | null;
  role: AdminRole;
  blocked: boolean;
  created_at: string;
}

type Msg = { ok: boolean; text: string } | null;

function Note({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p className={`text-sm ${msg.ok ? 'text-[var(--color-gold)]' : 'text-red-800'}`}>{msg.text}</p>;
}

/** Who can sign in here and what they may do, and your own password. */
export default function AdminsAdmin() {
  const db = getAdminDb();
  const myRole = useAdminRole();
  const roleOptions = ROLES.filter((r) => canManage(myRole, r)).map((r) => ({ value: r, label: ROLE_LABEL[r] }));
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [add, setAdd] = useState<{ username: string; email: string; password: string; role: AdminRole }>({ username: '', email: '', password: '', role: 'editor' });
  const [addMsg, setAddMsg] = useState<Msg>(null);
  const [pw, setPw] = useState({ next: '', again: '' });
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [listMsg, setListMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data }, { data: u }] = await Promise.all([db.from('admins').select('*').order('created_at'), db.auth.getUser()]);
    setAdmins((data ?? []) as Admin[]);
    setMe(u.user?.id ?? null);
  }, [db]);
  useEffect(() => {
    load();
  }, [load]);

  if (!admins) return <Loading />;

  async function call(body: Record<string, unknown>, done: string, setMsg: (m: Msg) => void) {
    setBusy(true);
    setMsg(null);
    try {
      await adminFetch('/api/admin/admins', body);
      setMsg({ ok: true, text: done });
      load();
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong.' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    const weak = passwordProblem(pw.next);
    if (weak) return setPwMsg({ ok: false, text: weak });
    if (pw.next !== pw.again) return setPwMsg({ ok: false, text: 'The two passwords are not the same.' });
    setBusy(true);
    const { error } = await db.auth.updateUser({ password: pw.next });
    setBusy(false);
    if (error) return setPwMsg({ ok: false, text: error.message });
    setPw({ next: '', again: '' });
    setPwMsg({ ok: true, text: 'Password changed. Use it next time you sign in.' });
  }

  return (
    <div>
      <PageTitle title="Admins" />
      <Help>
        Everyone signs in with a username and a password. {PASSWORD_RULE} Forgot a password? An owner or admin can set a new one here.
        {ROLES.map((r) => (
          <span key={r} className="mt-1 block">
            <strong className="font-normal text-[var(--color-ink)]">{ROLE_LABEL[r]}:</strong> {ROLE_HELP[r]}
          </span>
        ))}
      </Help>

      <div className="grid gap-6">
        <Card title="Admins">
          <ul className="divide-y divide-[var(--color-line)]">
            {admins.map((a) => {
              const manageable = a.user_id !== me && canManage(myRole, a.role);
              return (
                <li key={a.user_id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="flex-1">
                    <span className="block">
                      {a.username} <Badge tone={a.role === 'owner' ? 'dark' : 'quiet'}>{ROLE_LABEL[a.role]}</Badge> {a.blocked && <Badge tone="warn">Blocked</Badge>}{' '}
                      {a.user_id === me && <Badge tone="gold">You</Badge>}
                    </span>
                    {a.email && <span className="text-xs text-[var(--color-stone)]">{a.email}</span>}
                  </span>
                  {manageable && (
                    <>
                      <select
                        aria-label={`Role of ${a.username}`}
                        value={a.role}
                        disabled={busy}
                        onChange={(e) => isRole(e.target.value) && call({ action: 'set-role', userId: a.user_id, role: e.target.value }, `${a.username} is now ${ROLE_LABEL[e.target.value as AdminRole].toLowerCase()}.`, setListMsg)}
                        className="min-h-9 border border-[var(--color-line)] bg-white px-2 text-sm"
                      >
                        {roleOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <Button
                        disabled={busy}
                        onClick={() => {
                          const password = window.prompt(`New password for ${a.username}. ${PASSWORD_RULE}`);
                          if (!password) return;
                          const weak = passwordProblem(password);
                          if (weak) return setListMsg({ ok: false, text: weak });
                          call({ action: 'set-password', userId: a.user_id, password }, `${a.username} can sign in with the new password. Give it to them in person.`, setListMsg);
                        }}
                      >
                        New password
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          call(
                            { action: a.blocked ? 'unblock' : 'block', userId: a.user_id },
                            a.blocked ? `${a.username} can sign in again.` : `${a.username} is blocked and can no longer sign in.`,
                            setListMsg,
                          )
                        }
                      >
                        {a.blocked ? 'Unblock' : 'Block'}
                      </Button>
                      <Button
                        tone="danger"
                        disabled={busy}
                        onClick={async () =>
                          (await askConfirm(`Remove ${a.username}? They can no longer sign in.`)) && call({ action: 'remove', userId: a.user_id }, `${a.username} was removed.`, setListMsg)
                        }
                      >
                        Remove
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <Note msg={listMsg} />
        </Card>

        {roleOptions.length > 0 && (
          <Card title="Add someone">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Username" value={add.username} onChange={(username) => setAdd({ ...add, username })} hint="Small letters, numbers, dots." />
              <SelectField label="Role" value={add.role} onChange={(role) => setAdd({ ...add, role })} options={roleOptions} hint={ROLE_HELP[add.role]} />
              <TextField label="Email (optional)" type="email" value={add.email} onChange={(email) => setAdd({ ...add, email })} hint="Leave empty if they have none." />
              <TextField label="First password" type="password" value={add.password} onChange={(password) => setAdd({ ...add, password })} hint={`${PASSWORD_RULE} Give it to them in person.`} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                tone="dark"
                disabled={busy}
                onClick={async () => {
                  const weak = passwordProblem(add.password);
                  if (weak) return setAddMsg({ ok: false, text: weak });
                  if (await call({ action: 'create', ...add }, `${add.username} can sign in now.`, setAddMsg)) setAdd({ username: '', email: '', password: '', role: 'editor' });
                }}
              >
                Add
              </Button>
              <Note msg={addMsg} />
            </div>
          </Card>
        )}

        <Card title="Your password">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="New password" type="password" value={pw.next} onChange={(next) => setPw({ ...pw, next })} hint={PASSWORD_RULE} />
            <TextField label="New password again" type="password" value={pw.again} onChange={(again) => setPw({ ...pw, again })} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button tone="dark" disabled={busy} onClick={changePassword}>Change password</Button>
            <Note msg={pwMsg} />
          </div>
        </Card>
      </div>
    </div>
  );
}
