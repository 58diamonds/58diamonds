'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from 'react';
import { Badge, Help, PageTitle, Button } from '@/components/admin/ui';
import { adminFetch, publish } from '@/lib/admin-client';
import { getAdminDb } from '@/lib/supabase';
import type { InstagramPost } from '@/lib/types';
import { askConfirm } from '@/components/admin/confirm';

type Status = { connected: boolean; username: string | null; expiresAt: string | null; lastSyncedAt: string | null };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'never');

export default function InstagramAdmin() {
  const db = getAdminDb();
  const [status, setStatus] = useState<Status | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([
      adminFetch('/api/instagram', { action: 'status' }).catch((e) => ({ error: String(e.message) })),
      db.from('instagram_posts').select('*').order('taken_at', { ascending: false }).limit(48),
    ]);
    if ('error' in s) setMessage({ ok: false, text: String(s.error) });
    else setStatus(s as unknown as Status);
    setPosts((p.data ?? []) as InstagramPost[]);
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: 'connect' | 'sync' | 'disconnect') {
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminFetch('/api/instagram', { action, token });
      if (action === 'connect') setToken('');
      setMessage({ ok: true, text: action === 'disconnect' ? 'Disconnected.' : `Done. ${res.synced ?? 0} post(s) synced.` });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong.' });
    }
    setBusy(false);
    load();
  }

  async function toggle(p: InstagramPost) {
    await db.from('instagram_posts').update({ visible: !p.visible }).eq('id', p.id);
    publish();
    load();
  }

  return (
    <div>
      <PageTitle title="Instagram">
        {status?.connected && (
          <Button tone="dark" onClick={() => act('sync')} disabled={busy}>
            {busy ? 'Syncing...' : 'Sync now'}
          </Button>
        )}
      </PageTitle>
      <Help>
        The homepage shows your latest Instagram posts. They are fetched automatically every morning; &quot;Sync now&quot; fetches them straight
        away. Hide a post here and it stays hidden, even after later syncs.
      </Help>
      {message && <p className={`mb-4 rounded-md p-3 text-sm ${message.ok ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-800'}`}>{message.text}</p>}

      {status?.connected ? (
        <div className="mb-8 border bg-white border-[var(--color-line)] p-4 text-sm">
          <p>
            Connected as <strong className="font-normal">@{status.username}</strong>
          </p>
          <p className="mt-1 text-[var(--color-stone)]">Last sync: {fmt(status.lastSyncedAt)}. Access renews itself; current access runs until {fmt(status.expiresAt)}.</p>
          <div className="mt-3">
            <Button tone="danger" onClick={async () => (await askConfirm('Disconnect Instagram? Posts already on the site stay.')) && act('disconnect')}>
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        status && (
          <div className="mb-8 border bg-white border-[var(--color-line)] p-4">
            <p className="text-sm">Not connected yet. Paste an Instagram access token to connect (your web developer sets this up once).</p>
            <textarea value={token} onChange={(e) => setToken(e.target.value)} rows={3} className="mt-3 w-full rounded-md border border-[var(--color-line)] p-2 font-mono text-xs" placeholder="Access token" />
            <Button tone="dark" onClick={() => act('connect')} disabled={busy || !token.trim()}>
              {busy ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        )
      )}

      {posts.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {posts.map((p) => (
            <li key={p.id} className={p.visible ? '' : 'opacity-40'}>
              <a href={p.permalink} target="_blank" rel="noreferrer">
                <img src={p.image_url} alt="" className="aspect-square w-full rounded object-cover" />
              </a>
              <div className="mt-1 flex items-center justify-between">
                {!p.visible && <Badge tone="warn">Hidden</Badge>}
                <button onClick={() => toggle(p)} className="ml-auto py-1 text-xs underline underline-offset-2">
                  {p.visible ? 'Hide' : 'Show'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
