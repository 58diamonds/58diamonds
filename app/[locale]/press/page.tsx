import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Photo } from '@/components/site/Photo';
import { getFeatures, getPress } from '@/lib/data';
import { formatDate } from '@/lib/format';
import { tr } from '@/lib/i18n';
import { alternates, site } from '@/lib/site';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, t } = await site(params);
  return { title: t('press.title'), description: t('press.intro'), alternates: alternates(locale, '/press') };
}

/** Press: only exists when switched on in the admin and at least one article is published. */
export default async function PressPage({ params }: Props) {
  const { locale, t } = await site(params);
  const [features, articles] = await Promise.all([getFeatures(), getPress()]);
  if (!features.press) notFound();
  return (
    <div className="mx-auto max-w-6xl px-5 pt-16 sm:pt-20">
      <header className="text-center">
        <h1 className="font-display text-5xl sm:text-6xl">{t('press.title')}</h1>
        <p className="mx-auto mt-5 max-w-xl text-[var(--color-stone)]">{t('press.intro')}</p>
      </header>
      <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => {
          const link = a.url || a.file_url;
          const title = tr(a.title, locale);
          const inner = (
            <>
              <div className="overflow-hidden bg-[var(--color-pearl)]">
                <Photo src={a.image_url} alt={title || a.publication} className="aspect-[3/4] w-full transition duration-700 group-hover:scale-[1.03]" />
              </div>
              <p className="eyebrow mt-5">
                {a.publication}
                {a.published_on && <> · {formatDate(a.published_on, locale)}</>}
              </p>
              {title && <h2 className="font-display mt-2 text-2xl leading-snug">{title}</h2>}
              {link && <span className="mt-3 inline-block text-[0.72rem] uppercase tracking-[0.2em] underline underline-offset-4">{t('press.read')}</span>}
            </>
          );
          return link ? (
            <a key={a.id} href={link} target="_blank" rel="noreferrer" className="group block">
              {inner}
            </a>
          ) : (
            <div key={a.id}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
