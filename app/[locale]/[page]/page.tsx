import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Photo } from '@/components/site/Photo';
import { getPage } from '@/lib/data';
import { fill, tr } from '@/lib/i18n';
import { Markdown } from '@/lib/markdown';
import { alternates, pageVars, site } from '@/lib/site';

type Props = { params: Promise<{ locale: string; page: string }> };

/** Pages Farah creates in the admin (About, legal pages, anything new). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, settings } = await site(params);
  const page = await getPage((await params).page);
  if (!page) return {};
  const title = tr(page.seo_title, locale) || tr(page.title, locale);
  return {
    title,
    description: fill(tr(page.seo_description, locale) || plainText(tr(page.body, locale)), pageVars(settings)).slice(0, 160),
    alternates: alternates(locale, `/${page.slug}`),
    openGraph: page.image_url ? { images: [page.image_url] } : undefined,
  };
}

/** Markdown to one plain line: links keep their words, marks and headings go. */
function plainText(md: string): string {
  return md.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_>]/g, '').replace(/\s+/g, ' ').trim();
}

export default async function CustomPage({ params }: Props) {
  const { locale, settings } = await site(params);
  const page = await getPage((await params).page);
  if (!page) notFound();
  const title = tr(page.title, locale);
  return (
    <article className="mx-auto max-w-6xl px-5 pt-16 sm:pt-20">
      <h1 className="page-title text-center">{title}</h1>
      <div className={`mt-14 ${page.image_url ? 'grid gap-12 md:grid-cols-2 md:gap-20' : 'mx-auto max-w-2xl'}`}>
        {page.image_url && <Photo src={page.image_url} alt={title} eager className="aspect-[4/5] w-full" />}
        <div className="text-lg text-[var(--color-ink)]/90">
          <Markdown text={tr(page.body, locale)} locale={locale} vars={pageVars(settings)} />
        </div>
      </div>
    </article>
  );
}
