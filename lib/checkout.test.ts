import { describe, expect, it } from 'vitest';
import { priceBag } from './checkout';
import { DEMO_PIECES, DEMO_SECTIONS, DEMO_SETTINGS } from './demo';

const pear = DEMO_PIECES.find((p) => p.slug === 'triangle-ring')!;
const stack = DEMO_PIECES.find((p) => p.slug === 'baguette-link-bracelet')!;
const feather = DEMO_PIECES.find((p) => p.slug === 'rose-ring')!;
const size52 = pear.piece_variants.find((v) => v.label === '52')!;
const size48 = pear.piece_variants.find((v) => v.label === '48')!;
const settings = { ...DEMO_SETTINGS, shop_enabled: true, shipping_flat: 25, free_shipping_from: 10000, gift_wrap_price: 10 };
const run = (bag: Parameters<typeof priceBag>[0], reserved = new Map<string, number>(), giftWrap = false) =>
  priceBag(bag, DEMO_PIECES, DEMO_SECTIONS, settings, reserved, { giftWrap, locale: 'en' });

describe('pricing a bag', () => {
  it('uses the database price, adds shipping and gift wrap', () => {
    const r = run([{ pieceId: pear.id, variantId: size52.id, quantity: 1 }], new Map(), true);
    expect(r.problems).toEqual([]);
    expect(r.lines[0]).toMatchObject({ unitPrice: 5600, variantLabel: '52', quantity: 1 });
    expect(r).toMatchObject({ subtotal: 5600, shipping: 25, giftWrap: 10, total: 5635 });
  });
  it('ships free above the threshold', () => {
    expect(run([{ pieceId: stack.id, variantId: null, quantity: 1 }]).shipping).toBe(0);
  });
  it('refuses sold-out sizes, missing sizes, price-on-request pieces and unknown pieces', () => {
    const r = run([
      { pieceId: pear.id, variantId: size48.id, quantity: 1 },
      { pieceId: pear.id, variantId: null, quantity: 1 },
      { pieceId: feather.id, variantId: null, quantity: 1 },
      { pieceId: 'nope', variantId: null, quantity: 1 },
    ]);
    expect(r.lines).toEqual([]);
    expect(r.problems).toHaveLength(4);
    expect(r.total).toBe(0);
  });
  it('counts what other checkouts are holding', () => {
    const r = run([{ pieceId: stack.id, variantId: null, quantity: 1 }], new Map([[stack.id, 1]]));
    expect(r.lines).toEqual([]);
    expect(r.problems).toHaveLength(1);
  });
  it('trims a quantity to what is left', () => {
    const bracelet = DEMO_PIECES.find((p) => p.slug === 'tennis-bracelet')!;
    const r = run([{ pieceId: bracelet.id, variantId: null, quantity: 5 }]);
    expect(r.fixed).toEqual([{ pieceId: bracelet.id, variantId: null, quantity: 3 }]);
    expect(r.problems).toHaveLength(1);
  });
});
