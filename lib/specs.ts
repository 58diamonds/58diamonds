import { tr, type Locale } from './i18n';
import { stonesOf } from './shop';
import type { T } from './t';
import type { Attribute, Piece } from './types';

/**
 * The metal, weight and stones of a piece as written in its details:
 * "Yellow gold 18kt", "4.2 g", "Diamond 1.20 ct, Ruby 0.50 ct".
 */

export const KARATS = [18, 14, 10] as const;
export const DEFAULT_KARAT = 18;

/** Gold comes in karats; platinum does not. */
export function isGold(metal: Pick<Attribute, 'slug'> | null | undefined): boolean {
  return Boolean(metal && /gold/.test(metal.slug));
}

const numberLocale = (locale: Locale) => (locale === 'en' ? 'en-GB' : `${locale}-BE`);

export function formatGrams(g: number, locale: Locale): string {
  return `${new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 2 }).format(g)} g`;
}

export function formatCarats(ct: number, locale: Locale): string {
  return `${new Intl.NumberFormat(numberLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ct)} ct`;
}

/** A stone's name on the piece page: the longer name wins, in this language first. */
export function stoneName(a: Attribute, locale: Locale): string {
  return a.full_label?.[locale]?.trim() || a.label[locale]?.trim() || tr(a.full_label, locale) || tr(a.label, locale);
}

export function pieceSpecs(
  piece: Pick<Piece, 'metal_id' | 'karat' | 'weight_g' | 'stone_id' | 'stone_ids' | 'stone_carats'>,
  attributes: Attribute[],
  locale: Locale,
  t: T,
): { metal: string | null; weight: string | null; stones: string | null } {
  const metal = attributes.find((a) => a.id === piece.metal_id);
  const karat = isGold(metal) ? piece.karat : null;
  const stones = stonesOf(piece)
    .map((id) => attributes.find((a) => a.id === id))
    .filter((a): a is Attribute => a != null)
    .map((a) => {
      const ct = Number(piece.stone_carats?.[a.id]);
      return ct > 0 ? `${stoneName(a, locale)} ${formatCarats(ct, locale)}` : stoneName(a, locale);
    });
  const weight = Number(piece.weight_g);
  return {
    metal: metal ? [tr(metal.label, locale), karat ? t('piece.karat', { k: karat }) : ''].filter(Boolean).join(' ') : null,
    weight: weight > 0 ? formatGrams(weight, locale) : null,
    stones: stones.length ? stones.join(', ') : null,
  };
}
