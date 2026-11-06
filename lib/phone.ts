/**
 * Country codes for the phone field on the appointment form. Belgium first
 * (the default), then the neighbours, then the rest alphabetically.
 */
export interface DialCountry {
  code: string;
  dial: string;
}

export const DEFAULT_DIAL_COUNTRY = 'BE';

export const DIAL_COUNTRIES: DialCountry[] = [
  { code: 'BE', dial: '32' },
  { code: 'NL', dial: '31' },
  { code: 'FR', dial: '33' },
  { code: 'LU', dial: '352' },
  { code: 'DE', dial: '49' },
  { code: 'GB', dial: '44' },
  { code: 'AE', dial: '971' },
  { code: 'AT', dial: '43' },
  { code: 'AU', dial: '61' },
  { code: 'BR', dial: '55' },
  { code: 'CA', dial: '1' },
  { code: 'CH', dial: '41' },
  { code: 'CN', dial: '86' },
  { code: 'CY', dial: '357' },
  { code: 'CZ', dial: '420' },
  { code: 'DK', dial: '45' },
  { code: 'ES', dial: '34' },
  { code: 'FI', dial: '358' },
  { code: 'GR', dial: '30' },
  { code: 'HK', dial: '852' },
  { code: 'IE', dial: '353' },
  { code: 'IL', dial: '972' },
  { code: 'IN', dial: '91' },
  { code: 'IT', dial: '39' },
  { code: 'JP', dial: '81' },
  { code: 'LB', dial: '961' },
  { code: 'MA', dial: '212' },
  { code: 'MC', dial: '377' },
  { code: 'NO', dial: '47' },
  { code: 'PL', dial: '48' },
  { code: 'PT', dial: '351' },
  { code: 'QA', dial: '974' },
  { code: 'RO', dial: '40' },
  { code: 'RU', dial: '7' },
  { code: 'SA', dial: '966' },
  { code: 'SE', dial: '46' },
  { code: 'SG', dial: '65' },
  { code: 'TR', dial: '90' },
  { code: 'UA', dial: '380' },
  { code: 'US', dial: '1' },
  { code: 'ZA', dial: '27' },
];

/** The flag emoji for a two-letter country code. */
export function flag(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/**
 * The number as the client typed it, with the picked country in front:
 * "0484 22 30 90" with Belgium becomes "+32 484 22 30 90". A number typed
 * with its own + or 00 keeps its own country code. Empty stays empty.
 */
export function withCountryCode(countryCode: string, typed: string): string {
  const raw = typed.trim();
  if (!/\d/.test(raw)) return '';
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('00')) return `+${raw.slice(2).trim()}`;
  const dial = (DIAL_COUNTRIES.find((c) => c.code === countryCode) ?? DIAL_COUNTRIES[0]).dial;
  // Italy keeps its leading 0; everywhere else the 0 is the trunk prefix and goes.
  const local = dial === '39' ? raw : raw.replace(/^0+/, '');
  return `+${dial} ${local}`;
}
