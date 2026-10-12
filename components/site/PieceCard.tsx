import Link from 'next/link';
import type { PieceView } from '@/lib/piece-view';
import { Photo } from './Photo';
import { WishlistButton } from './WishlistButton';

export function PieceCard({ piece, eager = false }: { piece: PieceView; eager?: boolean }) {
  return (
    <div className="group relative">
      <Link href={piece.href} className="block">
        <div className="relative overflow-hidden bg-[var(--color-pearl)]">
          <Photo
            src={piece.image}
            alt={piece.imageAlt}
            eager={eager}
            className="aspect-square w-full transition duration-700 group-hover:scale-[1.03]"
          />
          {piece.hoverImage && (
            <Photo
              src={piece.hoverImage}
              alt=""
              className="absolute inset-0 aspect-square w-full opacity-0 transition duration-700 group-hover:opacity-100"
            />
          )}
        </div>
        <div className="mt-4 text-center">
          <h3 className="font-display text-xl leading-tight">{piece.title}</h3>
          <p
            className={`mt-1.5 text-[0.7rem] uppercase tracking-[0.22em] ${
              piece.status === 'sold' ? 'text-[var(--color-gold)]' : 'text-[var(--color-stone)]'
            }`}
          >
            {piece.priceText}
          </p>
        </div>
      </Link>
      <WishlistButton pieceId={piece.id} className="absolute right-2 top-2" />
    </div>
  );
}
