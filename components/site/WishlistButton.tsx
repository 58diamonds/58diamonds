'use client';

import { wishlist } from '@/lib/cart';
import { toggleWishlist } from '@/lib/wishlist-sync';
import { HeartIcon } from './icons';
import { useSite } from './SiteProvider';

export function WishlistButton({ pieceId, className = '', withLabel = false }: { pieceId: string; className?: string; withLabel?: boolean }) {
  const { t, features } = useSite();
  const saved = wishlist.use().includes(pieceId);
  if (!features.wishlist) return null;
  const label = saved ? t('wishlist.remove') : t('wishlist.add');
  return (
    <button
      type="button"
      onClick={() => toggleWishlist(pieceId)}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : label}
      title={label}
      className={`flex items-center gap-2 transition-colors ${
        withLabel ? 'text-[0.72rem] uppercase tracking-[0.2em] hover:text-[var(--color-gold)]' : 'h-10 w-10 justify-center rounded-full bg-[var(--color-ivory)]/85 hover:text-[var(--color-gold)]'
      } ${saved ? 'text-[var(--color-gold)]' : ''} ${className}`}
    >
      <HeartIcon filled={saved} />
      {withLabel && <span>{label}</span>}
    </button>
  );
}
