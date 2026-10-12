import { tr, type Locale } from './i18n';
import { pieceStock, purchasable, shippingFor } from './shop';
import type { Piece, Section, Settings } from './types';

export interface BagLine {
  pieceId: string;
  variantId: string | null;
  quantity: number;
}

export interface PricedLine {
  piece: Piece;
  variantId: string | null;
  variantLabel: string | null;
  title: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
}

export interface PricedBag {
  lines: PricedLine[];
  /** Lines that cannot be bought as asked (gone, sold out, fewer left). */
  problems: BagLine[];
  /** The bag as it can be bought, to put back in the browser after problems. */
  fixed: BagLine[];
  subtotal: number;
  shipping: number;
  giftWrap: number;
  total: number;
}

/**
 * Prices a bag from the database's own prices and stock; nothing the browser
 * sends is trusted except which pieces and how many. `reserved` holds what
 * checkouts in progress are holding (key: variant id, else piece id).
 */
export function priceBag(
  bag: BagLine[],
  pieces: Piece[],
  sections: Section[],
  settings: Settings,
  reserved: Map<string, number>,
  opts: { giftWrap: boolean; locale: Locale },
): PricedBag {
  const lines: PricedLine[] = [];
  const problems: BagLine[] = [];
  const fixed: BagLine[] = [];
  const seen = new Set<string>();

  for (const raw of bag) {
    const key = `${raw.pieceId}:${raw.variantId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const quantity = Math.floor(Number(raw.quantity));
    const piece = pieces.find((p) => p.id === raw.pieceId);
    const section = sections.find((s) => s.id === piece?.section_id) ?? null;
    if (!piece || !quantity || quantity < 1 || !purchasable(piece, section, settings.shop_enabled)) {
      problems.push(raw);
      continue;
    }
    const variants = piece.piece_variants ?? [];
    const variant = raw.variantId ? variants.find((v) => v.id === raw.variantId) : null;
    if (variants.length ? !variant : raw.variantId) {
      problems.push(raw);
      continue;
    }
    const stock = variant ? variant.stock : pieceStock(piece);
    const available = Math.max(0, stock - (reserved.get(variant?.id ?? piece.id) ?? 0));
    const take = Math.min(quantity, available);
    if (take < quantity) problems.push(raw);
    if (take === 0) continue;
    fixed.push({ pieceId: piece.id, variantId: variant?.id ?? null, quantity: take });
    lines.push({
      piece,
      variantId: variant?.id ?? null,
      variantLabel: variant?.label ?? null,
      title: tr(piece.title, opts.locale),
      image: piece.piece_images?.[0]?.url ?? null,
      unitPrice: Number(piece.price),
      quantity: take,
    });
  }

  const subtotal = round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const shipping = shippingFor(subtotal, settings);
  const giftWrap = opts.giftWrap && settings.gift_wrap_enabled && lines.length ? Number(settings.gift_wrap_price) || 0 : 0;
  return { lines, problems, fixed, subtotal, shipping, giftWrap, total: round(subtotal + shipping + giftWrap) };
}

const round = (n: number) => Math.round(n * 100) / 100;
