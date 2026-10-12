'use client';

import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import { formatDate, formatPrice } from '@/lib/format';
import { href } from '@/lib/routes';
import { getBrowserDb } from '@/lib/supabase';
import type { Address, Customer, Order } from '@/lib/types';

export function StatusBadge({ status }: { status: Order['status'] }) {
  const { t } = useSite();
  const tone =
    status === 'delivered' || status === 'shipped'
      ? 'bg-[var(--color-ink)] text-[var(--color-ivory)]'
      : status === 'cancelled' || status === 'refunded'
        ? 'bg-[var(--color-line)] text-[var(--color-stone)]'
        : 'bg-[var(--color-gold-soft)]/50 text-[var(--color-ink)]';
  return <span className={`inline-block px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] ${tone}`}>{t(`status.${status}`)}</span>;
}

export function AccountHome({ session }: { session: Session }) {
  const { locale, t, features } = useSite();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [profile, setProfile] = useState<Customer | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const db = getBrowserDb();
    db.from('orders')
      .select('*')
      .neq('status', 'pending')
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders((data ?? []) as Order[]));
    db.from('customers')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile((data as Customer | null) ?? { user_id: session.user.id, email: session.user.email ?? '', name: String(session.user.user_metadata?.name ?? ''), phone: null, address: {}, locale }));
  }, [session, locale]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '').trim();
    const address: Address = { line1: get('line1'), line2: get('line2'), postal_code: get('postal_code'), city: get('city'), country: get('country').toUpperCase() };
    const row = { user_id: session.user.id, email: session.user.email ?? '', name: get('name'), phone: get('phone') || null, address, locale };
    const { error } = await getBrowserDb().from('customers').upsert(row);
    if (!error) {
      setProfile((p) => ({ ...(p as Customer), ...row }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  const name = profile?.name || session.user.email;
  const a = profile?.address ?? {};

  return (
    <div className="grid gap-16 lg:grid-cols-[3fr_2fr]">
      <section>
        <p className="font-display text-3xl">{t('account.welcome', { name: name ?? '' })}</p>
        <h2 className="eyebrow mb-4 mt-10">{t('account.orders')}</h2>
        {orders === null ? (
          <p className="text-[var(--color-stone)]">{t('common.loading')}</p>
        ) : orders.length === 0 ? (
          <p className="text-[var(--color-stone)]">{t('account.no_orders')}</p>
        ) : (
          <ul className="border-t border-[var(--color-line)]">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={href.order(locale, o.number)} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] py-5 hover:bg-[var(--color-pearl)]/60">
                  <span>
                    <span className="font-display block text-2xl">{t('account.order', { number: `#${o.number}` })}</span>
                    <span className="text-sm text-[var(--color-stone)]">{t('account.ordered_on', { date: formatDate(o.created_at, locale) })}</span>
                  </span>
                  <span className="flex items-center gap-5">
                    <StatusBadge status={o.status} />
                    <span>{formatPrice(Number(o.total), o.currency, locale)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {features.wishlist && (
          <Link href={href.wishlist(locale)} className="btn btn-light mt-10">
            {t('wishlist.title')}
          </Link>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-4">{t('account.details')}</h2>
        {profile && (
          <form onSubmit={save} className="space-y-5">
            <label className="block">
              <span className="eyebrow">{t('account.name')}</span>
              <input name="name" defaultValue={profile.name} maxLength={200} autoComplete="name" className="field" />
            </label>
            <p className="text-sm text-[var(--color-stone)]">{session.user.email}</p>
            <label className="block">
              <span className="eyebrow">{t('account.phone')}</span>
              <input name="phone" defaultValue={profile.phone ?? ''} maxLength={50} autoComplete="tel" className="field" />
            </label>
            <p className="eyebrow pt-4">{t('account.address')}</p>
            <input name="line1" defaultValue={a.line1 ?? ''} placeholder={t('account.line1')} aria-label={t('account.line1')} autoComplete="address-line1" className="field" />
            <input name="line2" defaultValue={a.line2 ?? ''} placeholder={t('account.line2')} aria-label={t('account.line2')} autoComplete="address-line2" className="field" />
            <div className="grid grid-cols-[2fr_3fr] gap-4">
              <input name="postal_code" defaultValue={a.postal_code ?? ''} placeholder={t('account.postal_code')} aria-label={t('account.postal_code')} autoComplete="postal-code" className="field" />
              <input name="city" defaultValue={a.city ?? ''} placeholder={t('account.city')} aria-label={t('account.city')} autoComplete="address-level2" className="field" />
            </div>
            <input name="country" defaultValue={a.country ?? 'BE'} placeholder={t('account.country')} aria-label={t('account.country')} autoComplete="country" maxLength={2} className="field uppercase" />
            <div className="flex items-center gap-4 pt-2">
              <button type="submit" className="btn btn-dark">
                {t('account.save')}
              </button>
              {saved && <span className="text-sm text-[var(--color-gold)]" role="status">{t('account.saved')}</span>}
            </div>
          </form>
        )}
        <button type="button" onClick={() => getBrowserDb().auth.signOut()} className="mt-12 text-sm underline underline-offset-4 hover:text-[var(--color-gold)]">
          {t('account.sign_out')}
        </button>
      </section>
    </div>
  );
}
