import 'server-only';
import { getAttributes, getPieces } from './data';
import type { Locale } from './i18n';
import { pieceView } from './piece-view';
import { deliveryDays, pieceStock, pieceToOrder } from './shop';
import type { T } from './t';
import type { Section, Settings } from './types';
import { variantViews } from './variant';

/** A compact list of every piece, for the bag and wishlist pages (which live in the browser). */
export async function catalogFor(locale: Locale, t: T, settings: Settings, sections: Section[]) {
  const [pieces, attributes] = await Promise.all([getPieces(), getAttributes()]);
  return pieces.map((p) => ({
    ...pieceView(p, sections, settings, t, locale),
    price: p.price == null ? null : Number(p.price),
    stock: pieceStock({ ...p, piece_variants: [] }),
    toOrder: pieceToOrder(p),
    delivery: deliveryDays(p),
    variants: variantViews(p.piece_variants, attributes, locale, p),
  }));
}
export type CatalogItem = Awaited<ReturnType<typeof catalogFor>>[number];
