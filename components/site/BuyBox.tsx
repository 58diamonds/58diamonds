'use client';

import Link from 'next/link';
import { useState } from 'react';
import { addToCart, cart } from '@/lib/cart';
import { whatsappLink } from '@/lib/format';
import { href } from '@/lib/routes';
import { WhatsAppIcon } from './icons';
import { useSite } from './SiteProvider';
import { WishlistButton } from './WishlistButton';

interface Variant {
  id: string;
  label: string;
  stock: number;
}

/** Size choice, add to bag, and the ways to ask about a piece. */
export function BuyBox({
  pieceId,
  title,
  purchasable,
  stock,
  variants,
}: {
  pieceId: string;
  title: string;
  purchasable: boolean;
  stock: number;
  variants: Variant[];
}) {
  const { locale, t, whatsapp } = useSite();
  const lines = cart.use();
  const [variantId, setVariantId] = useState<string | null>(() => {
    const available = variants.filter((v) => v.stock > 0);
    return available.length === 1 ? available[0].id : null;
  });
  const [added, setAdded] = useState(false);
  const [needSize, setNeedSize] = useState(false);

  const chosen = variants.find((v) => v.id === variantId) ?? null;
  const max = variants.length ? chosen?.stock ?? 0 : stock;
  const inBag = lines.find((l) => l.pieceId === pieceId && l.variantId === (variants.length ? variantId : null))?.quantity ?? 0;
  const left = variants.length ? chosen?.stock : stock;
  const wa = whatsappLink(whatsapp, t('piece.ask_message', { piece: title }));

  function add() {
    if (variants.length && !chosen) {
      setNeedSize(true);
      return;
    }
    addToCart(pieceId, chosen?.id ?? null, max);
    setAdded(true);
  }

  return (
    <div className="mt-10">
      {purchasable && variants.length > 0 && (
        <fieldset className="mb-8">
          <legend className="eyebrow mb-3">{t('piece.size')}</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock === 0}
                aria-pressed={v.id === variantId}
                onClick={() => {
                  setVariantId(v.id);
                  setNeedSize(false);
                  setAdded(false);
                }}
                className="chip min-w-12 justify-center disabled:cursor-not-allowed disabled:line-through disabled:opacity-40"
              >
                {v.label}
              </button>
            ))}
          </div>
          {needSize && <p className="mt-3 text-sm text-red-800" role="alert">{t('piece.choose_size')}</p>}
        </fieldset>
      )}
      {!purchasable && variants.length > 0 && (
        <p className="mb-8">
          <span className="eyebrow mr-3">{t('piece.size')}</span>
          {variants.map((v) => v.label).join(' · ')}
        </p>
      )}

      {purchasable && left != null && left > 0 && left <= 2 && (
        <p className="mb-4 text-sm text-[var(--color-gold)]">{t('piece.left', { n: left })}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {purchasable ? (
          <button type="button" onClick={add} disabled={max > 0 && inBag >= max} className="btn btn-dark min-w-56 disabled:opacity-50">
            {t('piece.add')}
          </button>
        ) : (
          <Link href={`${href.contact(locale)}?piece=${encodeURIComponent(title)}#appointment`} className="btn btn-dark">
            {t('piece.view')}
          </Link>
        )}
        <WishlistButton pieceId={pieceId} withLabel className="ml-2" />
      </div>

      {added && (
        <p className="mt-4 text-sm" role="status">
          {t('piece.added')}.{' '}
          <Link href={href.bag(locale)} className="underline underline-offset-4 hover:text-[var(--color-gold)]">
            {t('cart.title')}
          </Link>
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[0.72rem] uppercase tracking-[0.2em]">
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-[var(--color-gold)]">
            <WhatsAppIcon className="h-4 w-4" /> {t('piece.ask')}
          </a>
        )}
        {purchasable && (
          <Link href={`${href.contact(locale)}?piece=${encodeURIComponent(title)}#appointment`} className="hover:text-[var(--color-gold)]">
            {t('piece.view')}
          </Link>
        )}
      </div>
    </div>
  );
}
