import { describe, expect, it } from 'vitest';
import { filterPieces, parseShopQuery, pieceStock, purchasable, shippingFor, shopQueryString, vatIncluded } from './shop';
import type { Piece, Section } from './types';

const section: Section = { id: 's', slug: 'rings', name: {}, description: {}, cover_url: null, position: 0, visible: true, show_prices: true };

const piece = (id: string, extra: Partial<Piece> = {}): Piece => ({
  id, section_id: 's', slug: id, title: { en: id }, description: {}, details: {}, price: 1000, show_price: true,
  for_sale: true, stock: 1, metal_id: null, stone_id: null, visible: true, featured: false, position: 0,
  seo_title: {}, seo_description: {}, published_at: '2026-01-01T00:00:00Z', piece_images: [], piece_variants: [], ...extra,
});

const attrs = { metal: new Map([['m1', 'yellow-gold'], ['m2', 'white-gold']]), stone: new Map([['s1', 'diamond']]) };
const sectionOf = () => section;

describe('stock and buying', () => {
  it('counts stock per size when a piece has sizes', () => {
    const ring = piece('r', { stock: 0, piece_variants: [
      { id: 'a', piece_id: 'r', label: '52', stock: 1, position: 0 },
      { id: 'b', piece_id: 'r', label: '54', stock: 2, position: 1 },
    ] });
    expect(pieceStock(ring)).toBe(3);
  });
  it('only sells pieces with a visible price, for sale and in stock', () => {
    expect(purchasable(piece('a'), section)).toBe(true);
    expect(purchasable(piece('a', { stock: 0 }), section)).toBe(false);
    expect(purchasable(piece('a', { show_price: false }), section)).toBe(false);
    expect(purchasable(piece('a', { for_sale: false }), section)).toBe(false);
    expect(purchasable(piece('a', { price: null }), section)).toBe(false);
    expect(purchasable(piece('a'), { ...section, show_prices: false })).toBe(false);
    expect(purchasable(piece('a'), section, false)).toBe(false);
  });
});

describe('shop filters and sorting', () => {
  const pieces = [
    piece('cheap', { price: 500, metal_id: 'm1', published_at: '2026-03-01T00:00:00Z', position: 2 }),
    piece('dear', { price: 9000, metal_id: 'm2', stone_id: 's1', published_at: '2026-01-01T00:00:00Z', position: 0 }),
    piece('hidden-price', { show_price: false, price: 100, metal_id: 'm1', published_at: '2026-05-01T00:00:00Z', position: 1 }),
    piece('sold', { price: 3000, stock: 0, metal_id: 'm1', published_at: '2026-02-01T00:00:00Z', position: 3 }),
  ];
  const run = (qs: Record<string, string>) => filterPieces(pieces, parseShopQuery(qs), attrs, sectionOf).map((p) => p.id);

  it('keeps the client order by default', () => {
    expect(run({})).toEqual(['dear', 'hidden-price', 'cheap', 'sold']);
  });
  it('sorts by price both ways, hidden prices last', () => {
    expect(run({ sort: 'price-asc' })).toEqual(['cheap', 'sold', 'dear', 'hidden-price']);
    expect(run({ sort: 'price-desc' })).toEqual(['dear', 'sold', 'cheap', 'hidden-price']);
  });
  it('sorts by date both ways', () => {
    expect(run({ sort: 'new' })).toEqual(['hidden-price', 'cheap', 'sold', 'dear']);
    expect(run({ sort: 'old' })).toEqual(['dear', 'sold', 'cheap', 'hidden-price']);
  });
  it('filters by metal, stone, price and availability', () => {
    expect(run({ metal: 'yellow-gold' })).toEqual(['hidden-price', 'cheap', 'sold']);
    expect(run({ metal: 'yellow-gold,white-gold', stone: 'diamond' })).toEqual(['dear']);
    expect(run({ min: '400', max: '3000' })).toEqual(['cheap', 'sold']);
    expect(run({ available: '1' })).toEqual(['dear', 'cheap']);
  });
  it('ignores nonsense in the address bar', () => {
    expect(parseShopQuery({ sort: 'evil', min: '-5', max: 'abc' })).toMatchObject({ sort: null, min: null, max: null });
  });
  it('writes short query strings', () => {
    expect(shopQueryString({ metal: ['a', 'b'], available: true, sort: 'new' })).toBe('?metal=a%2Cb&available=1&sort=new');
    expect(shopQueryString({ metal: [] })).toBe('');
  });
});

describe('money', () => {
  it('charges flat shipping below the free threshold', () => {
    expect(shippingFor(100, { shipping_flat: 15, free_shipping_from: 500 })).toBe(15);
    expect(shippingFor(500, { shipping_flat: 15, free_shipping_from: 500 })).toBe(0);
    expect(shippingFor(0, { shipping_flat: 15, free_shipping_from: null })).toBe(0);
  });
  it('finds the VAT inside a VAT-inclusive price', () => {
    expect(vatIncluded(121, 21)).toBe(21);
    expect(vatIncluded(1000, 21)).toBe(173.55);
  });
});
