import { describe, expect, it } from 'vitest';
import { enterpriseNumber, formatPrice, slugify, splitEvents, whatsappLink } from './format';

describe('formatPrice', () => {
  it('formats euros per language', () => {
    expect(formatPrice(2450, 'EUR', 'en').replace(/\s/g, ' ')).toMatch(/2,450|2\.450/);
    expect(formatPrice(2450, 'EUR', 'nl')).toContain('2.450');
    expect(formatPrice(99.5, 'EUR', 'fr')).toContain('99,50');
  });
});

describe('whatsappLink', () => {
  it('normalises the number and prefills the message', () => {
    expect(whatsappLink('+32 470 12 34 56', 'Hi')).toBe('https://wa.me/32470123456?text=Hi');
    expect(whatsappLink('0032470123456', '')).toBe('https://wa.me/32470123456');
  });
  it('is absent without a number', () => {
    expect(whatsappLink(null, 'Hi')).toBeNull();
  });
});

describe('slugify', () => {
  it('makes readable URLs', () => {
    expect(slugify('Bague Émeraude & Diamants')).toBe('bague-emeraude-diamants');
  });
});

describe('splitEvents', () => {
  it('keeps an event upcoming until it ends', () => {
    const now = new Date('2026-10-08T12:00:00Z');
    const e = (slug: string, starts_at: string, ends_at: string | null = null) => ({ id: slug, slug, title: { en: slug }, starts_at, ends_at, location: '', summary: {}, body: {}, image_url: null, link_url: null, published: true });
    const { upcoming, past } = splitEvents([e('a', '2026-10-01T10:00:00Z'), e('b', '2026-10-08T10:00:00Z', '2026-10-08T18:00:00Z'), e('c', '2026-11-01T10:00:00Z')], now);
    expect(upcoming.map((x) => x.slug)).toEqual(['b', 'c']);
    expect(past.map((x) => x.slug)).toEqual(['a']);
  });
});

describe('enterpriseNumber', () => {
  it('formats a Belgian VAT number as the enterprise number', () => {
    expect(enterpriseNumber('BE0711864093')).toBe('0711.864.093');
    expect(enterpriseNumber('BE 0711.864.093')).toBe('0711.864.093');
    expect(enterpriseNumber('')).toBe('');
    expect(enterpriseNumber('NL123')).toBe('');
  });
});
