import type { Metadata } from 'next';
import { ShopView } from '@/components/site/ShopView';
import { alternates, site } from '@/lib/site';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, t } = await site(params);
  return { title: t('shop.title'), description: t('seo.shop_description'), alternates: alternates(locale, '/shop') };
}

export default async function ShopPage({ params, searchParams }: Props) {
  const ctx = await site(params);
  return <ShopView {...ctx} section={null} searchParams={await searchParams} />;
}
