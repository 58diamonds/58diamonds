import 'server-only';
import { getPieces } from './data';
import type { Locale } from './i18n';
import { pieceView } from './piece-view';
import type { T } from './t';
import type { Section, Settings } from './types';

/** A compact list of every piece, for the bag and wishlist pages (which live in the browser). */
export async function catalogFor(locale: Locale, t: T, settings: Settings, sections: Section[]) {
  const pieces = await getPieces();
  return pieces.map((p) => ({
    ...pieceView(p, sections, settings, t, locale),
    price: p.price == null ? null : Number(p.price),
    stock: p.stock,
    variants: p.piece_variants.map((v) => ({ id: v.id, label: v.label, stock: v.stock })),
  }));
}
export type CatalogItem = Awaited<ReturnType<typeof catalogFor>>[number];
