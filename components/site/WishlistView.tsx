'use client';

import Link from 'next/link';
import { wishlist } from '@/lib/cart';
import type { CatalogItem } from '@/lib/catalog';
import { href } from '@/lib/routes';
import { PieceCard } from './PieceCard';
import { useSite } from './SiteProvider';

export function WishlistView({ catalog }: { catalog: CatalogItem[] }) {
  const { locale, t } = useSite();
  const ids = wishlist.use();
  const items = ids.map((id) => catalog.find((c) => c.id === id)).filter((c): c is CatalogItem => Boolean(c));
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 sm:pt-20">
      <h1 className="font-display text-center text-5xl sm:text-6xl">{t('wishlist.title')}</h1>
      {items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[var(--color-stone)]">{t('wishlist.empty')}</p>
          <Link href={href.shop(locale)} className="btn btn-dark mt-10">
            {t('cart.continue')}
          </Link>
        </div>
      ) : (
        <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
          {items.map((p) => (
            <PieceCard key={p.id} piece={p} />
          ))}
        </div>
      )}
    </div>
  );
}
