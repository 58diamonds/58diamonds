import { formatPrice } from './format';
import { tr, type Locale } from './i18n';
import { href } from './routes';
import { pieceStock, priceRange, priceVisible, purchasable } from './shop';
import type { T } from './t';
import type { Piece, Section, Settings } from './types';

export interface PieceView {
  id: string;
  slug: string;
  href: string;
  title: string;
  image: string | null;
  imageAlt: string;
  hoverImage: string | null;
  priceText: string;
  status: 'available' | 'sold' | 'request';
  purchasable: boolean;
}

/** What a piece card shows, worked out once on the server. */
export function pieceView(piece: Piece, sections: Section[], settings: Settings, t: T, locale: Locale): PieceView {
  const section = sections.find((s) => s.id === piece.section_id) ?? null;
  const title = tr(piece.title, locale);
  const [first, second] = piece.piece_images;
  const worn = wornPhoto(piece.piece_images);
  const showsPrice = priceVisible(piece, section);
  const soldOut = piece.for_sale && pieceStock(piece) === 0;
  return {
    id: piece.id,
    slug: piece.slug,
    href: href.piece(locale, piece.slug),
    title,
    image: first?.url ?? null,
    imageAlt: tr(first?.alt, locale) || title,
    hoverImage: (worn && worn !== first ? worn : second)?.url ?? null,
    priceText: soldOut ? t('shop.sold_out') : showsPrice ? priceLabel(piece, settings.currency, locale, t) : t('shop.on_request'),
    status: soldOut ? 'sold' : showsPrice ? 'available' : 'request',
    purchasable: purchasable(piece, section, settings.shop_enabled),
  };
}

/** "€1,200", or "From €1,200" when its gold colours or sizes cost different amounts. */
export function priceLabel(piece: Piece, currency: string, locale: Locale, t: T): string {
  const range = priceRange(piece) ?? { min: Number(piece.price), max: Number(piece.price) };
  const price = formatPrice(range.min, currency, locale);
  return range.max > range.min ? t('piece.from', { price }) : price;
}

/** The piece's photo on a model, if it has one. */
export function wornPhoto<I extends { worn?: boolean }>(images: I[]): I | undefined {
  return images.find((i) => i.worn);
}
