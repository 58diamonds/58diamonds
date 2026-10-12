import { fill, tr, type L10n, type Locale } from './i18n';
import type { TextKey } from './texts';

export type T = (key: TextKey, vars?: Record<string, string | number>) => string;

/** A translator for one language, from the texts loaded by getTexts(). */
export function makeT(texts: Record<TextKey, L10n>, locale: Locale): T {
  return (key, vars) => {
    const text = tr(texts[key], locale);
    return vars ? fill(text, vars) : text;
  };
}
