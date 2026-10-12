import { describe, expect, it } from 'vitest';
import { fill, tr } from './i18n';
import { pieceSpecs } from './specs';
import { TEXTS } from './texts';
import type { T } from './t';
import type { Attribute } from './types';

const a = (id: string, kind: 'metal' | 'stone', slug: string, label: Attribute['label'], full_label: Attribute['full_label'] = {}): Attribute => ({ id, kind, slug, label, full_label, position: 0 });
const attrs = [
  a('yg', 'metal', 'yellow-gold', { en: 'Yellow gold', nl: 'Geelgoud', fr: 'Or jaune' }),
  a('pt', 'metal', 'platinum', { en: 'Platinum' }),
  a('d', 'stone', 'diamond', { en: 'Diamond', fr: 'Diamant' }),
  a('lg', 'stone', 'lg-diamond', { en: 'LG Diamond' }, { en: 'Laboratory Grown Diamond', fr: 'Diamant de laboratoire' }),
];
const tFor = (locale: 'en' | 'nl' | 'fr'): T => (key, vars) => fill(tr(TEXTS[key].value, locale), vars ?? {});
const base = { metal_id: 'yg', karat: 18, weight_g: 4.2, stone_id: 'd', stone_ids: ['d', 'lg'], stone_carats: { d: 1.2 } };

describe('pieceSpecs', () => {
  it('writes metal with karat, weight and carats', () => {
    expect(pieceSpecs(base, attrs, 'en', tFor('en'))).toEqual({ metal: 'Yellow gold 18kt', weight: '4.2 g', stones: 'Diamond 1.20 ct, Laboratory Grown Diamond' });
  });
  it('uses the language and its decimal comma', () => {
    expect(pieceSpecs({ ...base, karat: 14 }, attrs, 'fr', tFor('fr'))).toEqual({ metal: 'Or jaune 14 carats', weight: '4,2 g', stones: 'Diamant 1,20 ct, Diamant de laboratoire' });
  });
  it('gives platinum no karat and skips empty values', () => {
    expect(pieceSpecs({ ...base, metal_id: 'pt', weight_g: null, stone_ids: [], stone_id: null }, attrs, 'en', tFor('en'))).toEqual({ metal: 'Platinum', weight: null, stones: null });
  });
});
