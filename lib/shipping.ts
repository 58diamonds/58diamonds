import { EU_VAT_RATES } from './vat';

/**
 * Shipping per country: a share of the pieces' value plus a fixed amount,
 * rounded up to a step (1% + €50, up to the next €5). A country without a
 * rate cannot be shipped to.
 */
export interface ShippingRate {
  /** Percent of the pieces' value, VAT included, gift wrap left out. */
  percent: number;
  fixed: number;
  /** Round up to the next multiple of this; 0 rounds to the cent. */
  round_to: number;
}

export type ShippingRates = Record<string, ShippingRate>;

export const EU_COUNTRIES = Object.keys(EU_VAT_RATES);

/** Countries the admin lists: the EU first, then the usual others. */
export const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Austria', BE: 'Belgium', BG: 'Bulgaria', CY: 'Cyprus', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark', EE: 'Estonia',
  ES: 'Spain', FI: 'Finland', FR: 'France', GR: 'Greece', HR: 'Croatia', HU: 'Hungary', IE: 'Ireland', IT: 'Italy',
  LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', MT: 'Malta', NL: 'Netherlands', PL: 'Poland', PT: 'Portugal',
  RO: 'Romania', SE: 'Sweden', SI: 'Slovenia', SK: 'Slovakia',
  GB: 'United Kingdom', CH: 'Switzerland', NO: 'Norway', MC: 'Monaco', US: 'United States', CA: 'Canada',
  AE: 'United Arab Emirates',
};

export const DEFAULT_EU_RATE: ShippingRate = { percent: 1, fixed: 50, round_to: 5 };

/** The cost of one rate for pieces worth `value`. */
export function rateCost(value: number, rate: ShippingRate): number {
  const raw = (value * (Number(rate.percent) || 0)) / 100 + (Number(rate.fixed) || 0);
  const step = Number(rate.round_to) || 0;
  // The small margin keeps 55.000000001 (a float leftover) at 55.
  if (step > 0) return Math.ceil(raw / step - 1e-9) * step;
  return Math.round(raw * 100) / 100;
}

/** Countries with a rate, in the admin's order. */
export function shippingCountries(rates: ShippingRates | null | undefined): string[] {
  const set = rates ?? {};
  return Object.keys(COUNTRY_NAMES).filter((c) => set[c]).concat(Object.keys(set).filter((c) => !(c in COUNTRY_NAMES)));
}

/** Countries a bag can be sent to: those with a rate, else the ship-to list. */
export function deliveryCountries(settings: { shipping_rates?: ShippingRates | null; ship_to: string[] }): string[] {
  return Object.keys(settings.shipping_rates ?? {}).length ? shippingCountries(settings.shipping_rates) : settings.ship_to;
}

/** Local name of a country, falling back to the English list. */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? COUNTRY_NAMES[code] ?? code;
  } catch {
    return COUNTRY_NAMES[code] ?? code;
  }
}
