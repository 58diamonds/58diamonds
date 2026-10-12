import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WishlistView } from '@/components/site/WishlistView';
import { catalogFor } from '@/lib/catalog';
import { site } from '@/lib/site';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await site(params);
  return { title: t('wishlist.title'), robots: { index: false } };
}

export default async function WishlistPage({ params }: Props) {
  const { locale, t, settings, sections } = await site(params);
  if (!settings.wishlist_enabled) notFound();
  return <WishlistView catalog={await catalogFor(locale, t, settings, sections)} />;
}
