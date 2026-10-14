import { describe, expect, it } from 'vitest';
import { DEFAULT_EU_RATE, EU_COUNTRIES, deliveryCountries, rateCost, shippingCountries } from './shipping';

describe('shipping rates', () => {
  it('rounds 1% + EUR 50 up to the next EUR 5', () => {
    expect(rateCost(1000, DEFAULT_EU_RATE)).toBe(60);
    expect(rateCost(1001, DEFAULT_EU_RATE)).toBe(65);
    expect(rateCost(500, DEFAULT_EU_RATE)).toBe(55);
    expect(rateCost(2350, DEFAULT_EU_RATE)).toBe(75);
  });
  it('rounds to the cent without a step', () => {
    expect(rateCost(1234.56, { percent: 1, fixed: 10, round_to: 0 })).toBe(22.35);
  });
  it('lists the countries that have a rate, else the ship-to list', () => {
    const all = Object.fromEntries(EU_COUNTRIES.map((c) => [c, DEFAULT_EU_RATE]));
    expect(shippingCountries(all)).toHaveLength(27);
    expect(deliveryCountries({ shipping_rates: {}, ship_to: ['BE'] })).toEqual(['BE']);
    expect(deliveryCountries({ shipping_rates: { NL: DEFAULT_EU_RATE }, ship_to: ['BE'] })).toEqual(['NL']);
  });
});
