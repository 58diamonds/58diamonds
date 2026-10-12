import 'server-only';
import { unstable_cache } from 'next/cache';
import { HAS_DATABASE, SHOP_LIVE } from './config';
import {
  DEMO_ATTRIBUTES,
  DEMO_EVENTS,
  DEMO_INSTAGRAM,
  DEMO_MENU,
  DEMO_PAGES,
  DEMO_PIECES,
  DEMO_PRESS,
  DEMO_SECTIONS,
  DEMO_SETTINGS,
} from './demo';
import type { L10n } from './i18n';
import { getPublicDb } from './supabase';
import { TEXTS, type TextKey } from './texts';
import type { Attribute, EventItem, InstagramPost, MenuItem, Page, Piece, PressArticle, Section, Settings } from './types';

/**
 * Every public read goes through here.
 *
 * With Supabase configured the content comes from the database, which the
 * client edits in /admin. Without it (a fresh checkout, a preview) the site
 * shows the starting content in `demo.ts`, so it never shows a broken page.
 *
 * Reads are cached under the "content" tag for a few minutes; the admin clears
 * that tag after every save (/api/revalidate), so changes show at once.
 */

export const CONTENT_TAG = 'content';

function cached<T>(name: string, fn: () => Promise<T>): () => Promise<T> {
  return unstable_cache(fn, [name], { tags: [CONTENT_TAG], revalidate: 300 });
}

async function rows<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>, fallback: T): Promise<T> {
  const { data, error } = await query;
  if (error) {
    console.error('Database read failed:', error.message);
    return fallback;
  }
  return (data ?? fallback) as T;
}

const db = () => getPublicDb();

export async function getSettings(): Promise<Settings> {
  const s = await loadSettings();
  // While the shop is hidden nothing can be bought, whatever the admin switch says.
  return SHOP_LIVE ? s : { ...s, shop_enabled: false };
}

const loadSettings = cached('settings', async (): Promise<Settings> => {
  if (!HAS_DATABASE) return DEMO_SETTINGS;
  const row = await rows<Settings | null>(db().from('settings').select('*').eq('id', 1).maybeSingle(), null);
  return row ? { ...row, shipping_flat: Number(row.shipping_flat), gift_wrap_price: Number(row.gift_wrap_price), vat_rate: Number(row.vat_rate), oss_registered: Boolean(row.oss_registered), eu_vat_rates: row.eu_vat_rates ?? {}, free_shipping_from: row.free_shipping_from == null ? null : Number(row.free_shipping_from) } : DEMO_SETTINGS;
});

/** All texts, the client's edits laid over the defaults in texts.ts. */
export const getTexts = cached('texts', async (): Promise<Record<TextKey, L10n>> => {
  const out = Object.fromEntries(Object.entries(TEXTS).map(([k, d]) => [k, d.value])) as Record<TextKey, L10n>;
  if (!HAS_DATABASE) return out;
  const edits = await rows<{ key: string; value: L10n }[]>(db().from('site_texts').select('key, value'), []);
  for (const { key, value } of edits) {
    if (key in out) out[key as TextKey] = { ...out[key as TextKey], ...Object.fromEntries(Object.entries(value).filter(([, v]) => v?.trim())) };
  }
  return out;
});

export const getMenu = cached('menu', async (): Promise<MenuItem[]> => {
  if (!HAS_DATABASE) return DEMO_MENU;
  return rows(db().from('menu_items').select('*').eq('visible', true).order('position'), [] as MenuItem[]);
});

export const getPages = cached('pages', async (): Promise<Page[]> => {
  if (!HAS_DATABASE) return DEMO_PAGES;
  return rows(db().from('pages').select('*').eq('published', true), [] as Page[]);
});

export async function getPage(slug: string): Promise<Page | null> {
  return (await getPages()).find((p) => p.slug === slug) ?? null;
}

export const getSections = cached('sections', async (): Promise<Section[]> => {
  if (!HAS_DATABASE) return DEMO_SECTIONS;
  return rows(db().from('sections').select('*').eq('visible', true).order('position'), [] as Section[]);
});

export const getAttributes = cached('attributes', async (): Promise<Attribute[]> => {
  if (!HAS_DATABASE) return DEMO_ATTRIBUTES;
  return rows(db().from('attributes').select('*').order('position'), [] as Attribute[]);
});

function tidy(p: Piece): Piece {
  return {
    ...p,
    price: p.price == null ? null : Number(p.price),
    piece_images: [...(p.piece_images ?? [])].sort((a, b) => a.position - b.position),
    piece_variants: [...(p.piece_variants ?? [])].sort((a, b) => a.position - b.position),
  };
}

/** Every piece the public may see (visible, in a visible section). */
export const getPieces = cached('pieces', async (): Promise<Piece[]> => {
  const sections = await getSections();
  const shown = (p: Piece) => p.visible && (!p.section_id || sections.some((s) => s.id === p.section_id));
  if (!HAS_DATABASE) return DEMO_PIECES.filter(shown);
  const list = await rows(
    db().from('pieces').select('*, piece_images(*), piece_variants(*)').eq('visible', true).order('position'),
    [] as Piece[],
  );
  return list.filter(shown).map(tidy);
});

export async function getPiece(slug: string): Promise<Piece | null> {
  return (await getPieces()).find((p) => p.slug === slug) ?? null;
}

export const getEvents = cached('events', async (): Promise<EventItem[]> => {
  if (!HAS_DATABASE) return DEMO_EVENTS;
  return rows(db().from('events').select('*').eq('published', true).order('starts_at'), [] as EventItem[]);
});

export const getPress = cached('press', async (): Promise<PressArticle[]> => {
  if (!HAS_DATABASE) return DEMO_PRESS;
  return rows(db().from('press_articles').select('*').eq('published', true).order('position'), [] as PressArticle[]);
});

export const getInstagramPosts = cached('instagram', async (): Promise<InstagramPost[]> => {
  if (!HAS_DATABASE) return DEMO_INSTAGRAM;
  return rows(
    db().from('instagram_posts').select('*').eq('visible', true).order('taken_at', { ascending: false }).limit(12),
    [] as InstagramPost[],
  );
});

/** Which optional parts of the site are switched on (and have content). */
export async function getFeatures() {
  const [settings, press, events] = await Promise.all([getSettings(), getPress(), getEvents()]);
  return {
    shop: settings.shop_enabled,
    /** Client accounts belong to the shop: no orders to show while it is hidden. */
    accounts: SHOP_LIVE,
    events: settings.events_enabled,
    press: settings.press_enabled && press.length > 0,
    wishlist: settings.wishlist_enabled,
    newsletter: settings.newsletter_enabled,
    hasEvents: events.length > 0,
  };
}
export type Features = Awaited<ReturnType<typeof getFeatures>>;
