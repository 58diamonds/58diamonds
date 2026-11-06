import { describe, expect, it } from 'vitest';
import { flag, withCountryCode } from './phone';
import { internationalDigits } from './format';

describe('withCountryCode', () => {
  it('puts the picked country in front of a local number', () => {
    expect(withCountryCode('BE', '0484 22 30 90')).toBe('+32 484 22 30 90');
    expect(withCountryCode('NL', '06 12345678')).toBe('+31 6 12345678');
    expect(withCountryCode('FR', '612345678')).toBe('+33 612345678');
  });
  it('keeps a number typed with its own country code', () => {
    expect(withCountryCode('BE', '+33 6 12 34 56 78')).toBe('+33 6 12 34 56 78');
    expect(withCountryCode('BE', '0031612345678')).toBe('+31612345678');
  });
  it('keeps the 0 for Italy', () => {
    expect(withCountryCode('IT', '06 1234 5678')).toBe('+39 06 1234 5678');
  });
  it('is empty without digits', () => {
    expect(withCountryCode('BE', '  ')).toBe('');
  });
  it('gives WhatsApp the right number', () => {
    expect(internationalDigits(withCountryCode('NL', '06 12345678'))).toBe('31612345678');
  });
});

describe('flag', () => {
  it('turns a country code into its flag', () => {
    expect(flag('BE')).toBe('🇧🇪');
  });
});
