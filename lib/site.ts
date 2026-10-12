import 'server-only';
import { notFound } from 'next/navigation';
import { getSections, getSettings, getTexts } from './data';
import { isLocale, LOCALES, type Locale } from './i18n';
import { enterpriseNumber } from './format';
import { makeT } from './t';
import type { Settings } from './types';

/** The basics every public page needs: its language, the texts and the settings. */
export async function site(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [settings, texts, sections] = await Promise.all([getSettings(), getTexts(), getSections()]);
  return { locale: locale as Locale, t: makeT(texts, locale), texts, settings, sections };
}

/** hreflang links for a page that exists in every language at /{locale}{path}. */
export function alternates(locale: Locale, path: string) {
  const languages = Object.fromEntries(LOCALES.map((l) => [l === 'en' ? 'en' : `${l}-BE`, `/${l}${path}`]));
  return { canonical: `/${locale}${path}`, languages: { ...languages, 'x-default': `/en${path}` } };
}

/** Settings that pages may quote with {braces}, e.g. {company_name}. */
/** A multi-line address as one line, for use inside a sentence. */
function oneLine(address: string | null): string {
  return (address ?? '').split('\n').map((l) => l.trim()).filter(Boolean).join(', ');
}

export function pageVars(s: Settings): Record<string, string> {
  return {
    company_name: s.company_name || '58 Diamonds',
    legal_name: s.legal_name || s.company_name || '58 Diamonds',
    company_address: oneLine(s.company_address),
    vat_number: s.vat_number || '',
    enterprise_number: enterpriseNumber(s.vat_number),
    // Never leave "reach us at ." when no email is set yet.
    email: s.email || s.phone || s.whatsapp_number || '',
    phone: s.phone || '',
  };
}
