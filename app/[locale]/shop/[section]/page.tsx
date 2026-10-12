import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShopView } from '@/components/site/ShopView';
import { tr } from '@/lib/i18n';
import { alternates, site } from '@/lib/site';

type Props = {
  params: Promise<{ locale: string; section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, t, sections } = await site(params);
  const { section: slug } = await params;
  const section = sections.find((s) => s.slug === slug);
  if (!section) return {};
  return {
    title: tr(section.name, locale),
    description: tr(section.description, locale) || t('seo.shop_description'),
    alternates: alternates(locale, `/shop/${slug}`),
    openGraph: section.cover_url ? { images: [section.cover_url] } : undefined,
  };
}

export default async function SectionPage({ params, searchParams }: Props) {
  const ctx = await site(params);
  const { section: slug } = await params;
  const section = ctx.sections.find((s) => s.slug === slug);
  if (!section) notFound();
  return <ShopView {...ctx} section={section} searchParams={await searchParams} />;
}
