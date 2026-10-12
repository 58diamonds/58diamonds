/**
 * VAT on online sales, for a seller established in Belgium.
 *
 * - Buyers in Belgium: Belgian VAT.
 * - Buyers in another EU country: Belgian VAT while sales to private buyers in
 *   other EU countries stay at or under EUR 10,000 a year (net of VAT, all
 *   those countries together, this year and last year). The sale that goes
 *   over, and every sale after it, takes the buyer's country rate, declared
 *   through OSS. Registering for OSS early does the same from day one.
 * - Buyers outside the EU: export, 0%.
 *
 * Prices on the site include VAT and stay the same everywhere; only the VAT
 * contained in them changes with the rate.
 */

export const HOME_COUNTRY = 'BE';

/** EU threshold for distance sales of goods (VAT Directive art. 59c), net of VAT. */
export const OSS_THRESHOLD = 10000;

/**
 * Standard VAT rate per EU country (ISO codes; Greece is GR here, EL in EU
 * tables). Checked on 2026-10-12 against the European Commission's Your
 * Europe table (europa.eu/youreurope, "VAT rules and rates", last updated
 * 13/07/2026). Jewellery has no reduced rate anywhere, so the standard rate
 * applies. A rate can be overridden in Admin > Settings if a country changes it.
 */
export const EU_VAT_RATES: Record<string, number> = {
  AT: 20,
  BE: 21,
  BG: 20,
  CY: 19,
  CZ: 21,
  DE: 19,
  DK: 25,
  EE: 24,
  ES: 21,
  FI: 25.5,
  FR: 20,
  GR: 24,
  HR: 25,
  HU: 27,
  IE: 23,
  IT: 22,
  LT: 21,
  LU: 17,
  LV: 21,
  MT: 18,
  NL: 21,
  PL: 23,
  PT: 23,
  RO: 21,
  SE: 25,
  SI: 22,
  SK: 23,
};

export type VatScheme = 'belgium' | 'oss' | 'export';

export interface VatChoice {
  rate: number;
  country: string;
  scheme: VatScheme;
}

export function isEu(country: string | null | undefined): boolean {
  return Boolean(country && normalize(country) in EU_VAT_RATES);
}

function normalize(country: string): string {
  const c = country.trim().toUpperCase();
  return c === 'EL' ? 'GR' : c;
}

/** The rate for a country, with any override from the admin. */
export function rateFor(country: string, overrides: Record<string, number> = {}): number {
  const c = normalize(country);
  const o = overrides[c];
  return typeof o === 'number' && Number.isFinite(o) && o >= 0 ? o : EU_VAT_RATES[c];
}

/** Net amount inside a VAT-inclusive total. */
export function netOf(gross: number, rate: number): number {
  return Math.round((gross / (1 + rate / 100)) * 100) / 100;
}

/**
 * Which VAT a sale takes.
 *
 * `soldThisYear` and `soldLastYear` are the net sales to private buyers in
 * other EU countries, before this sale.
 */
export function vatForSale(input: {
  country: string | null | undefined;
  gross: number;
  soldThisYear: number;
  soldLastYear: number;
  ossRegistered: boolean;
  homeRate: number;
  overrides?: Record<string, number>;
}): VatChoice {
  const country = normalize(input.country || HOME_COUNTRY);
  const home: VatChoice = { rate: input.homeRate, country, scheme: 'belgium' };
  if (country === HOME_COUNTRY) return home;
  if (!isEu(country)) return { rate: 0, country, scheme: 'export' };

  const over =
    input.ossRegistered ||
    input.soldLastYear > OSS_THRESHOLD ||
    input.soldThisYear + netOf(input.gross, input.homeRate) > OSS_THRESHOLD;
  return over ? { rate: rateFor(country, input.overrides), country, scheme: 'oss' } : home;
}
