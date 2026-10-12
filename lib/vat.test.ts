import { describe, expect, it } from 'vitest';
import { EU_VAT_RATES, OSS_THRESHOLD, isEu, netOf, rateFor, vatForSale } from './vat';

const base = { gross: 1210, soldThisYear: 0, soldLastYear: 0, ossRegistered: false, homeRate: 21 };

describe('EU VAT', () => {
  it('knows all 27 EU countries', () => {
    expect(Object.keys(EU_VAT_RATES)).toHaveLength(27);
    expect(isEu('gr')).toBe(true);
    expect(isEu('EL')).toBe(true);
    expect(isEu('CH')).toBe(false);
  });

  it('charges Belgian VAT in Belgium, whatever the total', () => {
    expect(vatForSale({ ...base, country: 'BE', soldThisYear: 50000, ossRegistered: true })).toEqual({ rate: 21, country: 'BE', scheme: 'belgium' });
  });

  it('charges Belgian VAT to other EU buyers up to the threshold', () => {
    expect(vatForSale({ ...base, country: 'FR', soldThisYear: 8000 })).toEqual({ rate: 21, country: 'FR', scheme: 'belgium' });
  });

  it('switches to the buyer country rate with the sale that goes over', () => {
    // 9,500 net so far; this sale adds 1,000 net.
    expect(vatForSale({ ...base, country: 'FR', soldThisYear: 9500 })).toEqual({ rate: 20, country: 'FR', scheme: 'oss' });
    expect(vatForSale({ ...base, country: 'HU', soldThisYear: OSS_THRESHOLD + 1 }).rate).toBe(27);
  });

  it('stays on the buyer country rate when last year went over', () => {
    expect(vatForSale({ ...base, country: 'DE', soldLastYear: 12000 }).rate).toBe(19);
  });

  it('uses the buyer country rate from day one once registered for OSS', () => {
    expect(vatForSale({ ...base, country: 'LU', ossRegistered: true })).toEqual({ rate: 17, country: 'LU', scheme: 'oss' });
  });

  it('treats sales outside the EU as exports', () => {
    expect(vatForSale({ ...base, country: 'CH' })).toEqual({ rate: 0, country: 'CH', scheme: 'export' });
    expect(vatForSale({ ...base, country: 'GB', ossRegistered: true }).rate).toBe(0);
  });

  it('applies admin overrides', () => {
    expect(rateFor('FR', { FR: 21.5 })).toBe(21.5);
    expect(rateFor('FR', {})).toBe(20);
    expect(vatForSale({ ...base, country: 'FR', ossRegistered: true, overrides: { FR: 22 } }).rate).toBe(22);
  });

  it('finds the net amount inside a gross price', () => {
    expect(netOf(1210, 21)).toBe(1000);
  });
});
