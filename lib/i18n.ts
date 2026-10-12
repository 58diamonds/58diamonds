/**
 * The site's languages. Every visitor-facing text is stored as an L10n object
 * ({ en, nl, fr }); `tr` picks the visitor's language and falls back to English
 * (then to any filled-in language) so a missing translation never shows a gap.
 */

export const LOCALES = ['en', 'nl', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', nl: 'Nederlands', fr: 'Français' };

/** For dates, numbers and prices. Belgian variants, since that is where the business is. */
export const INTL_LOCALE: Record<Locale, string> = { en: 'en-BE', nl: 'nl-BE', fr: 'fr-BE' };

export type L10n = Partial<Record<Locale, string>>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function tr(value: L10n | null | undefined, locale: Locale): string {
  if (!value) return '';
  const own = value[locale]?.trim();
  if (own) return own;
  const en = value.en?.trim();
  if (en) return en;
  for (const l of LOCALES) {
    const v = value[l]?.trim();
    if (v) return v;
  }
  return '';
}

/** Pick the best site language from an Accept-Language header. */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const wanted = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((x) => x.tag && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Replace {name} placeholders in a text. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
