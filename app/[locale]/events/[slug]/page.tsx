import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/site/JsonLd';
import { Photo } from '@/components/site/Photo';
import { SITE_URL } from '@/lib/config';
import { getEvents } from '@/lib/data';
import { formatEventDate } from '@/lib/format';
import { tr } from '@/lib/i18n';
import { Markdown } from '@/lib/markdown';
import { href } from '@/lib/routes';
import { alternates, site } from '@/lib/site';

type Props = { params: Promise<{ locale: string; slug: string }> };

async function find(slug: string) {
  return (await getEvents()).find((e) => e.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await site(params);
  const event = await find((await params).slug);
  if (!event) return {};
  return {
    title: tr(event.title, locale),
    description: tr(event.summary, locale) || undefined,
    alternates: alternates(locale, `/events/${event.slug}`),
    openGraph: event.image_url ? { images: [event.image_url] } : undefined,
  };
}

export default async function EventPage({ params }: Props) {
  const { locale, t, settings } = await site(params);
  const event = await find((await params).slug);
  if (!event || !settings.events_enabled) notFound();
  const title = tr(event.title, locale);
  const body = tr(event.body, locale) || tr(event.summary, locale);
  return (
    <article className="mx-auto max-w-3xl px-5 pt-14 sm:pt-20">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: title,
          startDate: event.starts_at,
          endDate: event.ends_at ?? undefined,
          location: event.location ? { '@type': 'Place', name: event.location } : undefined,
          image: event.image_url ? new URL(event.image_url, SITE_URL).toString() : undefined,
          organizer: { '@type': 'Organization', name: '58 Diamonds', url: SITE_URL },
        }}
      />
      <Link href={href.events(locale)} className="eyebrow hover:text-[var(--color-ink)]">
        {t('events.title')}
      </Link>
      <h1 className="font-display mt-4 text-5xl leading-tight">{title}</h1>
      <p className="mt-4 text-[var(--color-stone)]">
        {formatEventDate(event.starts_at, event.ends_at, locale)}
        {event.location && <> · {event.location}</>}
      </p>
      {event.image_url && <Photo src={event.image_url} alt={title} eager className="mt-10 aspect-[16/10] w-full" />}
      {body && (
        <div className="mt-10 text-lg">
          <Markdown text={body} locale={locale} />
        </div>
      )}
      {event.link_url && (
        <a href={event.link_url} target="_blank" rel="noreferrer" className="btn btn-dark mt-10">
          {t('events.more')}
        </a>
      )}
    </article>
  );
}
