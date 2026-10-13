import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventCard } from '@/components/site/EventCard';
import { getEvents } from '@/lib/data';
import { splitEvents } from '@/lib/format';
import { alternates, site } from '@/lib/site';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, t } = await site(params);
  return { title: t('events.title'), description: t('events.intro'), alternates: alternates(locale, '/events') };
}

export default async function EventsPage({ params }: Props) {
  const { locale, t, settings } = await site(params);
  if (!settings.events_enabled) notFound();
  const { upcoming, past } = splitEvents(await getEvents());
  return (
    <div className="mx-auto max-w-5xl px-5 pt-16 sm:pt-20">
      <header className="text-center">
        <h1 className="page-title">{t('events.title')}</h1>
        <p className="mx-auto mt-5 max-w-xl text-[var(--color-stone)]">{t('events.intro')}</p>
      </header>
      <section className="mt-16">
        <h2 className="eyebrow mb-8">{t('events.upcoming')}</h2>
        {upcoming.length ? (
          <div className="space-y-14">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} locale={locale} wide />
            ))}
          </div>
        ) : (
          <p className="text-[var(--color-stone)]">{t('events.none')}</p>
        )}
      </section>
      {past.length > 0 && (
        <section className="mt-24">
          <h2 className="eyebrow mb-8">{t('events.past')}</h2>
          <div className="space-y-14">
            {past.map((e) => (
              <EventCard key={e.id} event={e} locale={locale} wide past />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
