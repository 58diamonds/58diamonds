import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { getSettings } from '@/lib/data';

export const revalidate = 300;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  // Hidden from the public (Admin > Settings): ask search engines to stay away.
  if (settings.site_hidden) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/*/bag', '/*/account', '/*/checkout', '/*/wishlist'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
