import { TIME_ZONE } from './config';
import { INTL_LOCALE, type Locale } from './i18n';
import type { EventItem } from './types';

export function formatPrice(amount: number, currency: string, locale: Locale = 'en'): string {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: 'currency',
      currency,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

export function formatDate(iso: string, locale: Locale = 'en', withTime = false): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** URL-safe slug: lowercase, accents dropped, words joined by hyphens. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * wa.me link with a prefilled message.
 *
 * wa.me wants the number in international form with digits only, so "+32 470
 * 12 34 56" and "0032470123456" both become 32470123456.
 */
export function whatsappLink(number: string | null | undefined, message?: string): string | null {
  const digits = (number ?? '').replace(/\D/g, '').replace(/^00/, '');
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** Plain text with blank lines into paragraphs. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function formatEventDate(startsAt: string, endsAt: string | null, locale: Locale = 'en'): string {
  const intl = INTL_LOCALE[locale];
  const start = new Date(startsAt);
  const day = new Intl.DateTimeFormat(intl, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(start);
  const time = (d: Date) => new Intl.DateTimeFormat(intl, { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(d);
  if (!endsAt) return `${day}, ${time(start)}`;
  const end = new Date(endsAt);
  const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(d);
  if (dayKey(end) === dayKey(start)) return `${day}, ${time(start)} - ${time(end)}`;
  return `${day} - ${new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'long', timeZone: TIME_ZONE }).format(end)}`;
}

/** Events split into what is still to come (soonest first) and what is over (latest first). */
export function splitEvents(events: EventItem[], now = new Date()) {
  const upcoming: EventItem[] = [];
  const past: EventItem[] = [];
  for (const e of [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    const end = new Date(e.ends_at ?? e.starts_at);
    (end >= now ? upcoming : past).push(e);
  }
  past.reverse();
  return { upcoming, past };
}
