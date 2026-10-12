'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { cart, setQuantity } from '@/lib/cart';
import type { CatalogItem } from '@/lib/catalog';
import { HAS_DATABASE } from '@/lib/config';
import { formatPrice } from '@/lib/format';
import { href } from '@/lib/routes';
import { shippingFor } from '@/lib/shop';
import { Photo } from './Photo';
import { useSite } from './SiteProvider';

/**
 * The bag. Prices shown here come from the page; the checkout API prices the
 * bag again from the database before anyone pays.
 */
export function BagView({
  catalog,
  shipping,
  giftWrap,
}: {
  catalog: CatalogItem[];
  shipping: { flat: number; freeFrom: number | null };
  giftWrap: number | null;
}) {
  const { locale, t, currency, features } = useSite();
  const lines = cart.use();
  const cancelled = useSearchParams().get('cancelled') === '1';
  const [wrap, setWrap] = useState(false);
  const [message, setMessage] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'unavailable' | 'error' | 'off'>('idle');
  const money = (n: number) => formatPrice(n, currency, locale);

  const rows = lines
    .map((l) => {
      const item = catalog.find((c) => c.id === l.pieceId);
      if (!item) return null;
      const variant = l.variantId ? item.variants.find((v) => v.id === l.variantId) : null;
      const max = variant ? variant.stock : item.variants.length ? 0 : item.stock;
      return { line: l, item, variant, max: Math.max(max, 0) };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const buyable = rows.filter((r) => r.item.purchasable && r.max > 0);
  const subtotal = buyable.reduce((s, r) => s + (r.item.price ?? 0) * Math.min(r.line.quantity, r.max), 0);
  const ship = shippingFor(subtotal, { shipping_flat: shipping.flat, free_shipping_from: shipping.freeFrom });
  const wrapCost = wrap && giftWrap ? giftWrap : 0;
  const total = subtotal + ship + wrapCost;

  async function checkout() {
    setState('busy');
    let token: string | undefined;
    if (HAS_DATABASE) {
      const { getBrowserDb } = await import('@/lib/supabase');
      token = (await getBrowserDb().auth.getSession()).data.session?.access_token;
    }
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ lines, locale, giftWrap: wrap, giftMessage: message, acceptTerms: accepted }),
    }).catch(() => null);
    const json = (await res?.json().catch(() => ({}))) as { url?: string; error?: string; fixed?: typeof lines };
    if (res?.ok && json.url) {
      window.location.href = json.url;
      return;
    }
    if (json.error === 'unavailable' && json.fixed) {
      cart.set(json.fixed);
      setState('unavailable');
      return;
    }
    setState(json.error === 'not_configured' ? 'off' : 'error');
  }

  if (!rows.length) {
    return (
      <div className="mx-auto max-w-xl px-5 py-28 text-center">
        <h1 className="font-display text-5xl">{t('cart.title')}</h1>
        {cancelled && <p className="mt-6 text-[var(--color-stone)]">{t('checkout.cancel_text')}</p>}
        <p className="mt-6 text-[var(--color-stone)]">{t('cart.empty')}</p>
        <Link href={href.shop(locale)} className="btn btn-dark mt-10">
          {t('cart.continue')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 sm:pt-20">
      <h1 className="font-display text-center text-5xl sm:text-6xl">{t('cart.title')}</h1>
      {cancelled && (
        <p className="mx-auto mt-6 max-w-xl text-center text-[var(--color-stone)]" role="status">
          <strong className="font-normal text-[var(--color-ink)]">{t('checkout.cancel_title')}.</strong> {t('checkout.cancel_text')}
        </p>
      )}
      <div className="mt-14 grid gap-14 lg:grid-cols-[3fr_2fr]">
        <ul className="border-t border-[var(--color-line)]">
          {rows.map(({ line, item, variant, max }) => {
            const ok = item.purchasable && max > 0;
            return (
              <li key={`${line.pieceId}${line.variantId}`} className="grid grid-cols-[6rem_1fr] gap-5 border-b border-[var(--color-line)] py-6 sm:grid-cols-[7.5rem_1fr]">
                <Link href={item.href} className="block bg-[var(--color-pearl)]">
                  <Photo src={item.image} alt={item.imageAlt} className="aspect-square w-full" />
                </Link>
                <div className="flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link href={item.href} className="font-display text-2xl leading-tight hover:text-[var(--color-gold)]">
                        {item.title}
                      </Link>
                      {variant && (
                        <p className="mt-1 text-sm text-[var(--color-stone)]">
                          {t('piece.size')} {variant.label}
                        </p>
                      )}
                    </div>
                    <p className="whitespace-nowrap">{ok ? money((item.price ?? 0) * Math.min(line.quantity, max)) : ''}</p>
                  </div>
                  {!ok && <p className="mt-2 text-sm text-[var(--color-gold)]">{t('shop.sold_out')}</p>}
                  <div className="mt-auto flex items-center gap-6 pt-4 text-sm">
                    {ok && max > 1 && (
                      <label className="flex items-center gap-2">
                        <span className="text-[var(--color-stone)]">{t('cart.quantity')}</span>
                        <select
                          value={Math.min(line.quantity, max)}
                          onChange={(e) => setQuantity(line.pieceId, line.variantId, Number(e.target.value))}
                          className="border-b border-[var(--color-line)] bg-transparent py-1"
                        >
                          {Array.from({ length: Math.min(max, 10) }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button type="button" onClick={() => setQuantity(line.pieceId, line.variantId, 0)} className="underline underline-offset-4 hover:text-[var(--color-gold)]">
                      {t('cart.remove')}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit bg-[var(--color-pearl)] p-7 sm:p-9">
          {giftWrap != null && (
            <div className="mb-7 border-b border-[var(--color-line)] pb-7">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
                <span>
                  {t('cart.gift_wrap')}{' '}
                  <span className="text-[var(--color-stone)]">({giftWrap > 0 ? money(giftWrap) : t('cart.gift_wrap_free')})</span>
                </span>
              </label>
              {wrap && (
                <label className="mt-5 block">
                  <span className="eyebrow">{t('cart.gift')}</span>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 300))} rows={3} className="field resize-none" />
                  <span className="mt-1 block text-xs text-[var(--color-stone)]">{t('cart.gift_message_hint')}</span>
                </label>
              )}
            </div>
          )}
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-[var(--color-stone)]">{t('cart.subtotal')}</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-stone)]">{t('cart.shipping')}</dt>
              <dd>{ship ? money(ship) : t('cart.free')}</dd>
            </div>
            {wrapCost > 0 && (
              <div className="flex justify-between">
                <dt className="text-[var(--color-stone)]">{t('invoice.gift_wrap')}</dt>
                <dd>{money(wrapCost)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--color-line)] pt-4 text-lg">
              <dt>{t('cart.total')}</dt>
              <dd>{money(total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-[var(--color-stone)]">{t('cart.vat')}</p>

          <label className="mt-7 flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-ink)]" />
            <span>
              {t('cart.accept')
                .split(/(\{terms\}|\{returns\})/)
                .map((part, i) =>
                  part === '{terms}' || part === '{returns}' ? (
                    <Link key={i} href={href.page(locale, part === '{terms}' ? 'terms' : 'returns')} target="_blank" className="underline underline-offset-4 hover:text-[var(--color-gold)]">
                      {t(part === '{terms}' ? 'cart.accept_terms' : 'cart.accept_returns')}
                    </Link>
                  ) : (
                    part
                  ),
                )}
            </span>
          </label>
          <button type="button" onClick={checkout} disabled={!buyable.length || !accepted || state === 'busy' || !features.shop} className="btn btn-dark mt-5 w-full disabled:opacity-50">
            {state === 'busy' ? t('common.loading') : t('cart.checkout')}
          </button>
          {state === 'unavailable' && <p className="mt-4 text-sm text-red-800" role="alert">{t('cart.unavailable')}</p>}
          {state === 'error' && <p className="mt-4 text-sm text-red-800" role="alert">{t('cart.error')}</p>}
          {state === 'off' && <p className="mt-4 text-sm text-red-800" role="alert">{t('checkout.unavailable_preview')}</p>}
          <p className="mt-6 text-xs leading-relaxed text-[var(--color-stone)]">{t('cart.insured')} {t('cart.secure')}</p>
        </aside>
      </div>
    </div>
  );
}
