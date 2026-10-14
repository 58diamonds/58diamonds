import { describe, expect, it } from 'vitest';
import { TEXTS } from './texts';
import { DEFAULT_SECTION_ORDER, orderSections, textSections } from './text-sections';

describe('text sections', () => {
  it('lists every text exactly once', () => {
    const keys = textSections().flatMap((s) => s.keys);
    expect(keys.sort()).toEqual(Object.keys(TEXTS).sort());
  });

  it('follows the default order', () => {
    expect(textSections().map((s) => s.name)).toEqual(DEFAULT_SECTION_ORDER);
  });

  it('keeps unknown and missing sections when a saved order is applied', () => {
    const s = ['A', 'B', 'C', 'D'].map((name) => ({ name }));
    expect(orderSections(s, ['C', 'gone', 'A']).map((x) => x.name)).toEqual(['C', 'D', 'A', 'B']);
    expect(orderSections(s, null).map((x) => x.name)).toEqual(['A', 'B', 'C', 'D']);
  });
});
