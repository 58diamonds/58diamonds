'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { HAS_DATABASE, SHOP_LIVE } from '@/lib/config';
import { getAdminDb } from '@/lib/supabase';
import { AdminLogin } from './AdminLogin';

const NAV: { group: string; items: { href: string; label: string }[] }[] = [
  { group: 'Website', items: [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/home', label: 'Homepage' },
    { href: '/admin/pages', label: 'Pages' },
    { href: '/admin/menu', label: 'Menus' },
    { href: '/admin/texts', label: 'Texts' },
    { href: '/admin/events', label: 'Events' },
    { href: '/admin/press', label: 'Press' },
    { href: '/admin/instagram', label: 'Instagram' },
  ] },
  { group: 'Collection', items: [
    { href: '/admin/pieces', label: 'Pieces' },
    { href: '/admin/sections', label: 'Sections and filters' },
  ] },
  // The shop screens exist but stay out of the menu until the shop goes live.
  ...(SHOP_LIVE
    ? [{ group: 'Shop', items: [
        { href: '/admin/orders', label: 'Orders' },
        { href: '/admin/clients', label: 'Clients' },
      ] }]
    : []),
  { group: 'Contact', items: [
    { href: '/admin/requests', label: 'Appointment requests' },
    { href: '/admin/newsletter', label: 'Newsletter' },
  ] },
  { group: 'Setup', items: [
    { href: '/admin/settings', label: 'Settings' },
    { href: '/admin/admins', label: 'Admins' },
  ] },
];

type State = 'loading' | 'signed-out' | 'not-admin' | 'ready';

/**
 * Sign-in and navigation for /admin.
 *
 * This decides what to show; it does not protect anything. Every read and
 * write of private data is checked by the database (is_admin()), so skipping
 * this screen gains nothing.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<State>('loading');
  const [open, setOpen] = useState(false);

  const resolve = useCallback(async () => {
    const db = getAdminDb();
    const { data } = await db.auth.getSession();
    if (!data.session) return setState('signed-out');
    const { data: ok } = await db.rpc('is_admin');
    setState(ok === true ? 'ready' : 'not-admin');
  }, []);

  useEffect(() => {
    if (!HAS_DATABASE) return;
    resolve();
    const { data: sub } = getAdminDb().auth.onAuthStateChange(() => {
      // Deferred: calling Supabase inside this callback can deadlock its auth lock.
      setTimeout(resolve, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [resolve]);

  useEffect(() => setOpen(false), [pathname]);

  if (!HAS_DATABASE) {
    return (
      <Centered>
        <h1 className="font-display text-3xl">Admin</h1>
        <p className="mt-3 text-sm text-[var(--color-stone)]">
          The database is not connected yet. Set the Supabase keys described in docs/SETUP.md and this page becomes the sign-in.
        </p>
      </Centered>
    );
  }
  if (state === 'loading') return <Centered><p className="text-sm text-[var(--color-stone)]">One moment...</p></Centered>;
  if (state === 'signed-out') return <AdminLogin onDone={resolve} />;
  if (state === 'not-admin') {
    return (
      <Centered>
        <h1 className="font-display text-3xl">No access</h1>
        <p className="mt-3 text-sm text-[var(--color-stone)]">This account is not an admin of this site.</p>
        <button className="btn btn-light mt-6" onClick={() => getAdminDb().auth.signOut()}>
          Sign out
        </button>
      </Centered>
    );
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  const nav = (
    <nav aria-label="Admin" className="space-y-7">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-2 px-3 text-[0.62rem] uppercase tracking-[0.28em] text-[var(--color-gold)]">{g.group}</p>
          <ul>
            {g.items.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={isActive(n.href) ? 'page' : undefined}
                  className={`font-display block border-l px-3 py-1.5 text-[1.12rem] transition ${isActive(n.href) ? 'border-[var(--color-gold)] text-[var(--color-ink)]' : 'border-transparent text-[var(--color-stone)] hover:text-[var(--color-ink)]'}`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="admin-ui min-h-svh bg-[var(--color-ivory)] lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="hidden border-r border-[var(--color-line)] bg-[var(--color-pearl)] px-4 py-7 lg:sticky lg:top-0 lg:block lg:h-svh lg:overflow-y-auto">
        <Link href="/admin" className="mb-9 block px-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-ink.svg" alt="58 Diamonds" className="h-14 w-auto" />
        </Link>
        {nav}
        <div className="mt-10 space-y-2 px-3 text-[0.66rem] uppercase tracking-[0.22em] text-[var(--color-stone)]">
          <a href="/" target="_blank" className="block hover:text-[var(--color-ink)]">View site ↗</a>
          <button onClick={() => getAdminDb().auth.signOut()} className="block uppercase hover:text-[var(--color-ink)]">Sign out</button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-pearl)] px-4 py-3 lg:hidden">
        <Link href="/admin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-ink.svg" alt="58 Diamonds" className="h-9 w-auto" />
        </Link>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-[0.66rem] uppercase tracking-[0.22em]">
          {open ? 'Close' : 'Menu'}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[3.85rem] z-30 overflow-y-auto bg-[var(--color-pearl)] px-4 py-6 lg:hidden">
          {nav}
          <div className="mt-8 flex gap-6 px-3 text-[0.66rem] uppercase tracking-[0.22em] text-[var(--color-stone)]">
            <a href="/" target="_blank">View site ↗</a>
            <button onClick={() => getAdminDb().auth.signOut()} className="uppercase">Sign out</button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-8 sm:pt-10">{children}</main>
    </div>
  );
}

export function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="admin-ui flex min-h-svh items-center justify-center bg-[var(--color-ivory)] px-5">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
