import { tr, type Locale } from './i18n';
import type { Attribute, PieceVariant } from './types';

/** What the customer sees for one option: "Rose gold", "52" or "Rose gold, 52". */
export function variantName(v: Pick<PieceVariant, 'label' | 'metal_id'>, attributes: Attribute[], locale: Locale): string {
  const metal = v.metal_id ? attributes.find((a) => a.id === v.metal_id) : null;
  return [metal ? tr(metal.label, locale) : '', v.label.trim()].filter(Boolean).join(', ');
}

/** The options as the piece page and the bag need them. */
export function variantViews(variants: PieceVariant[], attributes: Attribute[], locale: Locale) {
  return [...variants]
    .sort((a, b) => a.position - b.position)
    .map((v) => {
      const metal = v.metal_id ? attributes.find((a) => a.id === v.metal_id) : null;
      return {
        id: v.id,
        label: v.label.trim(),
        metal: metal ? tr(metal.label, locale) : null,
        name: variantName(v, attributes, locale),
        stock: v.stock,
      };
    });
}
export type VariantView = ReturnType<typeof variantViews>[number];
