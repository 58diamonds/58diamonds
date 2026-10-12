import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { getEvents, getFeatures, getPages, getPieces, getSections } from '@/lib/data';
import { LOCALES } from '@/lib/i18n';

export const revalidate = 3600;

/** Every public page in the three languages, each pointing at its translations. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pieces, sections, pages, events, features] = await Promise.all([getPieces(), getSections(), getPages(), getEvents(), getFeatures()]);
  const entry = (path: string, lastModified?: string, priority = 0.5): MetadataRoute.Sitemap =>
    LOCALES.map((l) => ({
      url: `${SITE_URL}/${l}${path}`,
      lastModified: lastModified ? new Date(lastModified) : undefined,
      priority,
      alternates: { languages: Object.fromEntries(LOCALES.map((x) => [x === 'en' ? 'en' : `${x}-BE`, `${SITE_URL}/${x}${path}`])) },
    }));

  return [
    ...entry('', undefined, 1),
    ...entry('/shop', undefined, 0.9),
    ...sections.flatMap((s) => entry(`/shop/${s.slug}`, undefined, 0.8)),
    ...pieces.flatMap((p) => entry(`/piece/${p.slug}`, p.updated_at ?? p.published_at, 0.7)),
    ...entry('/contact', undefined, 0.6),
    ...pages.flatMap((p) => entry(`/${p.slug}`, p.updated_at, 0.4)),
    ...(features.events ? [...entry('/events', undefined, 0.5), ...events.flatMap((e) => entry(`/events/${e.slug}`, undefined, 0.4))] : []),
    ...(features.press ? entry('/press', undefined, 0.4) : []),
  ];
}
