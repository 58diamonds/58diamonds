import { rateCost, type ShippingRates } from './shipping';
import type { Piece, Section, Settings } from './types';

/**
 * Shop rules in one place, shared by the pages, the bag and the checkout API.
 * Pure functions, so they are easy to test (lib/shop.test.ts).
 */

/** Stock a piece can still sell: the sum of its sizes when it has sizes. */
export function pieceStock(piece: Pick<Piece, 'stock' | 'piece_variants'>): number {
  const variants = piece.piece_variants ?? [];
  if (variants.length) return variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
  return Math.max(0, piece.stock);
}

/** Does the visitor see a price? */
export function priceVisible(
  piece: Pick<Piece, 'price' | 'show_price'>,
  section: Pick<Section, 'show_prices'> | null | undefined,
): boolean {
  return piece.price != null && piece.show_price && (section ? section.show_prices : true);
}

/** Can it go in the bag? A visible price, for sale, and something left. */
export function purchasable(
  piece: Pick<Piece, 'price' | 'show_price' | 'for_sale' | 'stock' | 'piece_variants'>,
  section: Pick<Section, 'show_prices'> | null | undefined,
  shopEnabled = true,
): boolean {
  return shopEnabled && piece.for_sale && priceVisible(piece, section) && pieceStock(piece) > 0;
}

export type SortKey = 'new' | 'old' | 'price-asc' | 'price-desc';
export const SORT_KEYS: SortKey[] = ['new', 'old', 'price-asc', 'price-desc'];

export interface ShopQuery {
  section?: string | null;
  metal: string[];
  stone: string[];
  size: string[];
  min: number | null;
  max: number | null;
  available: boolean;
  sort: SortKey | null;
}

type Params = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean);
}

function num(v: string | string[] | undefined): number | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Read filters and sorting from the address bar (?metal=gold&size=52&sort=price-asc). */
export function parseShopQuery(params: Params): ShopQuery {
  const sort = (Array.isArray(params.sort) ? params.sort[0] : params.sort) as SortKey | undefined;
  return {
    metal: list(params.metal),
    stone: list(params.stone),
    size: list(params.size),
    min: num(params.min),
    max: num(params.max),
    available: params.available === '1',
    sort: sort && SORT_KEYS.includes(sort) ? sort : null,
  };
}

/** Back to a query string, leaving out what is empty, so links stay short. */
export function shopQueryString(q: Partial<ShopQuery>): string {
  const p = new URLSearchParams();
  if (q.metal?.length) p.set('metal', q.metal.join(','));
  if (q.stone?.length) p.set('stone', q.stone.join(','));
  if (q.size?.length) p.set('size', q.size.join(','));
  if (q.min != null) p.set('min', String(q.min));
  if (q.max != null) p.set('max', String(q.max));
  if (q.available) p.set('available', '1');
  if (q.sort) p.set('sort', q.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Every size used by these pieces, once, in a natural order (48, 49, ... 60, then lengths). */
export function sizesOf(pieces: Pick<Piece, 'piece_variants'>[]): string[] {
  const all = new Set(pieces.flatMap((p) => (p.piece_variants ?? []).map((v) => v.label.trim()).filter(Boolean)));
  return [...all].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function activeFilterCount(q: ShopQuery): number {
  return q.metal.length + q.stone.length + q.size.length + (q.min != null || q.max != null ? 1 : 0) + (q.available ? 1 : 0);
}

/**
 * Filter and sort pieces for the shop.
 *
 * Price filters and price sorting only consider prices the visitor can see;
 * "price on request" pieces drop out of a price filter and go last when sorting
 * by price, either way, so the order never gives a hidden price away.
 * Without a chosen sort the client's own order (position) applies.
 */
export function filterPieces(
  pieces: Piece[],
  q: ShopQuery,
  attrs: { metal: Map<string, string>; stone: Map<string, string> },
  sectionOf: (p: Piece) => Section | null | undefined,
): Piece[] {
  const shownPrice = (p: Piece) => (priceVisible(p, sectionOf(p)) ? Number(p.price) : null);
  const out = pieces.filter((p) => {
    if (q.metal.length && !(p.metal_id && q.metal.includes(attrs.metal.get(p.metal_id) ?? ''))) return false;
    if (q.stone.length && !stonesOf(p).some((id) => q.stone.includes(attrs.stone.get(id) ?? ''))) return false;
    if (q.size.length && !(p.piece_variants ?? []).some((v) => q.size.includes(v.label.trim()))) return false;
    if (q.min != null || q.max != null) {
      const price = shownPrice(p);
      if (price == null) return false;
      if (q.min != null && price < q.min) return false;
      if (q.max != null && price > q.max) return false;
    }
    if (q.available && !purchasable(p, sectionOf(p))) return false;
    return true;
  });

  const time = (p: Piece) => new Date(p.published_at).getTime();
  const byPrice = (dir: 1 | -1) => (a: Piece, b: Piece) => {
    const pa = shownPrice(a);
    const pb = shownPrice(b);
    if (pa == null && pb == null) return a.position - b.position;
    if (pa == null) return 1;
    if (pb == null) return -1;
    return (pa - pb) * dir || a.position - b.position;
  };

  switch (q.sort) {
    case 'new':
      return out.sort((a, b) => time(b) - time(a));
    case 'old':
      return out.sort((a, b) => time(a) - time(b));
    case 'price-asc':
      return out.sort(byPrice(1));
    case 'price-desc':
      return out.sort(byPrice(-1));
    default:
      // The client's own order: sections in their order, pieces within them.
      return out.sort((a, b) => (sectionOf(a)?.position ?? 0) - (sectionOf(b)?.position ?? 0) || a.position - b.position);
  }
}

/**
 * Shipping cost for a bag subtotal sent to `country`. With rates per country,
 * a country without one gets null: it cannot be shipped to. Without any
 * rates, the flat price applies everywhere.
 */
export function shippingFor(
  subtotal: number,
  settings: Pick<Settings, 'shipping_flat' | 'free_shipping_from'> & { shipping_rates?: ShippingRates | null },
  country?: string | null,
): number | null {
  const rates = settings.shipping_rates ?? {};
  const rate = country ? rates[country.toUpperCase()] : undefined;
  if (Object.keys(rates).length && !rate) return null;
  if (subtotal <= 0) return 0;
  if (settings.free_shipping_from != null && subtotal >= Number(settings.free_shipping_from)) return 0;
  return rate ? rateCost(subtotal, rate) : Number(settings.shipping_flat) || 0;
}

/** VAT contained in a price that already includes it (Belgian retail prices do). */
export function vatIncluded(total: number, ratePercent: number): number {
  if (!ratePercent) return 0;
  return Math.round((total * ratePercent) / (100 + ratePercent) * 100) / 100;
}

/** A piece's stones; older rows only have stone_id. */
export function stonesOf(p: Pick<Piece, 'stone_id' | 'stone_ids'>): string[] {
  return p.stone_ids?.length ? p.stone_ids : p.stone_id ? [p.stone_id] : [];
}
