'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { getAdminDb } from '@/lib/supabase';

/** Admin sign-in: username and password. */
export function AdminLogin({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);
    const json = (await res?.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; error?: string };
    if (!res?.ok || !json.access_token || !json.refresh_token) {
      setBusy(false);
      setError(json.error ?? 'Sign-in failed. Try again.');
      return;
    }
    await getAdminDb().auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token });
    setBusy(false);
    setPassword('');
    onDone();
  }

  const field = 'mt-2 block w-full border border-[var(--color-line)] bg-[var(--color-ivory)] px-3 py-3 text-[0.95rem] outline-none focus:border-[var(--color-gold)]';

  return (
    <main className="admin-ui flex min-h-svh items-center justify-center bg-[var(--color-ivory)] px-5 py-10">
      <div className="w-full max-w-sm border border-[var(--color-line)] bg-white px-8 py-10">
        <img src="/brand/logo-ink.svg" alt="58 Diamonds" className="mx-auto h-16 w-auto" />
        <h1 className="font-display mt-6 text-center text-3xl">Admin</h1>
        <p className="mt-2 text-center text-[var(--color-stone)]">Sign in to manage the website.</p>

        <form onSubmit={signIn} className="mt-8 space-y-5">
          <label className="block">
            <span className="label">Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" autoCapitalize="none" spellCheck={false} className={field} />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={field} />
          </label>
          {error && <p className="text-sm text-red-800" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-dark w-full">
            {busy ? 'One moment...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
