import { SHOP_LIVE } from './config';
import type { Locale } from './i18n';
import type { MenuItem, Page, Section } from './types';

/** Every address on the public site, in one place. */
export const href = {
  home: (l: Locale) => `/${l}`,
  shop: (l: Locale, section?: string | null) => (section ? `/${l}/shop/${section}` : `/${l}/shop`),
  piece: (l: Locale, slug: string) => `/${l}/piece/${slug}`,
  bag: (l: Locale) => `/${l}/bag`,
  wishlist: (l: Locale) => `/${l}/wishlist`,
  account: (l: Locale) => `/${l}/account`,
  order: (l: Locale, number: number) => `/${l}/account/orders/${number}`,
  events: (l: Locale) => `/${l}/events`,
  event: (l: Locale, slug: string) => `/${l}/events/${slug}`,
  press: (l: Locale) => `/${l}/press`,
  contact: (l: Locale) => `/${l}/contact`,
  page: (l: Locale, slug: string) => `/${l}/${slug}`,
};

/** Page addresses the client cannot use for her own pages, because the site uses them. */
export const RESERVED_SLUGS = [
  'shop', 'piece', 'bag', 'wishlist', 'account', 'checkout', 'events', 'press', 'contact',
  'newsletter', 'api', 'admin', 'en', 'nl', 'fr', 'sitemap', 'robots',
];

export interface NavLink {
  id: string;
  href: string;
  label: L10nLabel;
  external?: boolean;
  /** The builtin it points to, for highlighting the current page. */
  match?: string;
}
type L10nLabel = MenuItem['label'];

/**
 * Turn menu rows into links. Items that point to something switched off or
 * gone (press with no article, a deleted page, a hidden section) are dropped.
 */
export function resolveMenu(
  items: MenuItem[],
  menu: MenuItem['menu'],
  ctx: { locale: Locale; pages: Page[]; sections: Section[]; features: { events: boolean; press: boolean } },
): NavLink[] {
  const l = ctx.locale;
  const out: NavLink[] = [];
  for (const item of items.filter((i) => i.menu === menu && i.visible).sort((a, b) => a.position - b.position)) {
    if (item.kind === 'builtin') {
      if (item.target === 'events' && !ctx.features.events) continue;
      if (item.target === 'press' && !ctx.features.press) continue;
      if (item.target === 'account' && !SHOP_LIVE) continue;
      const to: Record<string, string> = {
        home: href.home(l), shop: href.shop(l), events: href.events(l), press: href.press(l),
        contact: href.contact(l), account: href.account(l),
      };
      if (!item.target || !to[item.target]) continue;
      out.push({ id: item.id, href: to[item.target], label: item.label, match: item.target === 'home' ? undefined : to[item.target] });
    } else if (item.kind === 'page') {
      const page = ctx.pages.find((p) => p.id === item.page_id);
      if (!page) continue;
      out.push({ id: item.id, href: href.page(l, page.slug), label: hasText(item.label) ? item.label : page.title, match: href.page(l, page.slug) });
    } else if (item.kind === 'section') {
      const section = ctx.sections.find((s) => s.id === item.section_id);
      if (!section) continue;
      out.push({ id: item.id, href: href.shop(l, section.slug), label: hasText(item.label) ? item.label : section.name, match: href.shop(l, section.slug) });
    } else if (item.url) {
      out.push({ id: item.id, href: item.url, label: item.label, external: /^https?:/.test(item.url) });
    }
  }
  return out;
}

function hasText(label: L10nLabel) {
  return Object.values(label ?? {}).some((v) => v?.trim());
}
