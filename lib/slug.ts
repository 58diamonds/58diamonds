/**
 * Web addresses. A new piece, page or event starts with a placeholder address
 * ("new-piece-mv5ld283"); until it is first published its address follows its
 * English name, and every address is kept unique.
 */

const PLACEHOLDER = /^(new-piece|new-page|event|piece)-[a-z0-9]{6,}$/;

/** Is this the address given at creation, before anyone chose one? */
export function isPlaceholderSlug(slug: string): boolean {
  return PLACEHOLDER.test(slug);
}

/** `base`, or `base-2`, `base-3`... whichever is not taken yet. */
export function nextFreeSlug(base: string, taken: string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}
