'use client';

import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { HAS_DATABASE } from '@/lib/config';
import { getBrowserDb } from '@/lib/supabase';
import { mergeWishlist } from '@/lib/wishlist-sync';

/**
 * The client's session. `recovering` is true when they arrived from a
 * "forgot password" email and must choose a new password first.
 */
export function useAccount() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!HAS_DATABASE);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!HAS_DATABASE) return;
    const db = getBrowserDb();
    db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = db.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_IN' && s) {
        void claim(s.access_token);
        void mergeWishlist();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, ready, recovering, setRecovering };
}

/** Make sure the profile exists and attach earlier guest orders (server side). */
export async function claim(token: string, extra: { name?: string; locale?: string } = {}) {
  await fetch('/api/account/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(extra),
  }).catch(() => undefined);
}

/** Download an invoice PDF as the signed-in client. */
export async function downloadInvoice(orderId: string, invoiceNumber: string) {
  const { data } = await getBrowserDb().auth.getSession();
  const res = await fetch(`/api/invoice/${orderId}`, { headers: { authorization: `Bearer ${data.session?.access_token ?? ''}` } });
  if (!res.ok) return;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${invoiceNumber}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
