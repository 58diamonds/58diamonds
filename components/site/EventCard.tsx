import Link from 'next/link';
import { formatEventDate } from '@/lib/format';
import { tr, type Locale } from '@/lib/i18n';
import { href } from '@/lib/routes';
import type { EventItem } from '@/lib/types';
import { Photo } from './Photo';

export function EventCard({ event, locale, wide = false, past = false }: { event: EventItem; locale: Locale; wide?: boolean; past?: boolean }) {
  const title = tr(event.title, locale);
  const summary = tr(event.summary, locale);
  return (
    <Link
      href={href.event(locale, event.slug)}
      className={`group grid gap-6 ${wide ? 'sm:grid-cols-[2fr_3fr] sm:items-center' : ''} ${past ? 'opacity-75' : ''}`}
    >
      <div className="overflow-hidden">
        <Photo src={event.image_url} alt={title} className="aspect-[4/3] w-full transition duration-700 group-hover:scale-[1.03]" />
      </div>
      <div>
        <p className="eyebrow">{formatEventDate(event.starts_at, event.ends_at, locale)}</p>
        <h3 className="font-display mt-3 text-3xl">{title}</h3>
        {event.location && <p className="mt-1 text-sm text-[var(--color-stone)]">{event.location}</p>}
        {summary && <p className="mt-4 text-[var(--color-stone)]">{summary}</p>}
      </div>
    </Link>
  );
}
