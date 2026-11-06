'use client';

import { useMemo, useState } from 'react';
import { INTL_LOCALE, type Locale } from '@/lib/i18n';
import { DEFAULT_DIAL_COUNTRY, DIAL_COUNTRIES, flag } from '@/lib/phone';

/**
 * A phone number with the country picked in front of it (Belgium by default),
 * so a client who types "0484 22 30 90" is saved as +32 484 22 30 90 and the
 * WhatsApp link opens the right number. The form reads `phone_country` and
 * `phone` and joins them with withCountryCode().
 */
export function PhoneField({ label, locale }: { label: string; locale: Locale }) {
  const [country, setCountry] = useState(DEFAULT_DIAL_COUNTRY);
  const current = DIAL_COUNTRIES.find((c) => c.code === country) ?? DIAL_COUNTRIES[0];

  const options = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([INTL_LOCALE[locale]], { type: 'region' });
    } catch {
      names = null;
    }
    return DIAL_COUNTRIES.map((c) => ({ ...c, name: names?.of(c.code) ?? c.code }));
  }, [locale]);

  return (
    <div>
      <label htmlFor="phone" className="eyebrow">{label}</label>
      <div className="flex items-stretch border-b border-[var(--color-line)] focus-within:border-[var(--color-gold)]">
        <div className="relative shrink-0">
          {/* What the client sees: flag and code. The real select sits on top, invisible, so the full country list opens on tap. */}
          <span aria-hidden="true" className="pointer-events-none flex h-full items-center gap-1.5 pr-3 text-base">
            <span>{flag(current.code)}</span>
            <span>+{current.dial}</span>
            <svg viewBox="0 0 10 6" className="h-2 w-2.5 text-[var(--color-stone)]" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 1l4 4 4-4" />
            </svg>
          </span>
          <select
            name="phone_country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            aria-label={label}
            autoComplete="tel-country-code"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {options.map((c) => (
              <option key={c.code} value={c.code}>
                {flag(c.code)} {c.name} (+{c.dial})
              </option>
            ))}
          </select>
        </div>
        <span aria-hidden="true" className="my-2.5 w-px bg-[var(--color-line)]" />
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          maxLength={40}
          autoComplete="tel-national"
          className="field pl-3"
          // The line under the field is drawn by the row, around the country too.
          style={{ borderBottom: 0 }}
        />
      </div>
    </div>
  );
}
