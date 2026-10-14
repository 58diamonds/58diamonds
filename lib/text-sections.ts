import { TEXTS, type TextKey } from './texts';

/**
 * How Admin > Texts lists the texts: sections in the order they appear on the
 * site, and the texts inside each section in the order they appear on the
 * page. Sections not listed in PLACED keep the group from lib/texts.ts and the
 * order there. Texts the site does not show at the moment go last, so they
 * don't get in the way.
 */
const PLACED: Record<string, TextKey[]> = {
  Header: ['nav.open_menu', 'nav.close_menu', 'nav.account', 'nav.bag', 'nav.book'],
  Homepage: [
    'home.scroll',
    'home.tiles_title',
    'home.house_eyebrow',
    'home.house_title',
    'home.featured_eyebrow',
    'home.featured_title',
    'home.featured_link',
    'home.about_eyebrow',
    'home.about_title',
    'home.about_text',
    'home.about_link',
    'home.events_title',
    'home.instagram_title',
    'home.contact_eyebrow',
    'home.contact_title',
    'footer.appointment',
  ],
  Footer: ['footer.client_care', 'footer.legal', 'footer.trade_name', 'footer.enterprise', 'footer.vat', 'footer.follow'],
  'Not on the site at the moment': [
    'home.house1_title',
    'home.house1_text',
    'home.house2_title',
    'home.house2_text',
    'home.house3_title',
    'home.house3_text',
    'home.process_eyebrow',
    'home.process_title',
    'home.step1_title',
    'home.step1_text',
    'home.step2_title',
    'home.step2_text',
    'home.step3_title',
    'home.step3_text',
    'home.contact_showroom',
    'home.contact_visits',
    'footer.tagline',
    'footer.contact',
    'footer.rights',
    'booking.type',
    'newsletter.consent',
  ],
};

/** Labels that read better once the text sits in its section here. */
export const SECTION_LABELS: Partial<Record<TextKey, string>> = {
  'home.scroll': 'Line at the bottom of the big photo',
  'footer.appointment': 'Contact block: appointment line',
};

/** Default order of the sections, as on the site; emails and the like after. */
export const DEFAULT_SECTION_ORDER = [
  'Header',
  'Homepage',
  'Shop',
  'Piece page',
  'Events and press',
  'Contact',
  'Booking calendar',
  'Wishlist',
  'Newsletter',
  'Footer',
  'Bag and checkout',
  'Client account',
  'Other',
  'Search engines',
  'Emails',
  'Invoices',
  'Not on the site at the moment',
];

/** Every section with its texts, in the default order. */
export function textSections(): { name: string; keys: TextKey[] }[] {
  const placed = new Set(Object.values(PLACED).flat());
  const byName = new Map<string, TextKey[]>(Object.entries(PLACED).map(([n, keys]) => [n, [...keys]]));
  for (const k of Object.keys(TEXTS) as TextKey[]) {
    if (placed.has(k)) continue;
    const g = TEXTS[k].group;
    if (!byName.has(g)) byName.set(g, []);
    byName.get(g)!.push(k);
  }
  const rank = (n: string) => {
    const i = DEFAULT_SECTION_ORDER.indexOf(n);
    return i < 0 ? DEFAULT_SECTION_ORDER.length - 1.5 : i;
  };
  return [...byName.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([name, keys]) => ({ name, keys }));
}

/** Puts the sections in a saved order; sections missing from it keep their default place. */
export function orderSections<T extends { name: string }>(sections: T[], saved: string[] | null): T[] {
  if (!saved?.length) return sections;
  const out = saved.map((n) => sections.find((s) => s.name === n)).filter((s): s is T => Boolean(s));
  sections.forEach((s, i) => {
    if (out.includes(s)) return;
    const before = sections.slice(0, i).reverse().find((p) => out.includes(p));
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, s);
  });
  return out;
}
