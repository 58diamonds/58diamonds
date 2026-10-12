'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cart } from '@/lib/cart';
import { href } from '@/lib/routes';
import { useSite } from './SiteProvider';

/** After paying on Stripe: empty the bag and say thank you with the order number. */
export function CheckoutSuccess() {
  const { locale, t } = useSite();
  const params = useSearchParams();
  const [number, setNumber] = useState<number | null>(null);

  useEffect(() => {
    cart.set([]);
    const order = params.get('order');
    const session = params.get('session');
    if (!order || !session) return;
    fetch(`/api/order?order=${encodeURIComponent(order)}&session=${encodeURIComponent(session)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { number?: number } | null) => d?.number && setNumber(d.number))
      .catch(() => undefined);
  }, [params]);

  return (
    <div className="mx-auto max-w-xl px-5 py-28 text-center">
      <p className="eyebrow">58 Diamonds</p>
      <h1 className="font-display mt-3 text-5xl">{t('checkout.thanks_title')}</h1>
      <p className="mt-6 text-lg leading-relaxed text-[var(--color-stone)]">{t('checkout.thanks_text', { number: number ? `#${number}` : '' }).replace(/\s+/g, ' ')}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href={href.account(locale)} className="btn btn-dark">
          {t('account.orders')}
        </Link>
        <Link href={href.shop(locale)} className="btn btn-light">
          {t('cart.continue')}
        </Link>
      </div>
    </div>
  );
}
