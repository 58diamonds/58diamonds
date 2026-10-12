'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Button, Help, Loading, PageTitle, Toggle, show } from '@/components/admin/ui';
import { publish, useNewFromLink } from '@/lib/admin-client';
import { getAdminDb } from '@/lib/supabase';
import type { EventItem } from '@/lib/types';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** Shows, trunk shows and private viewings. Past events move to the bottom. */
export default function EventsAdmin() {
  const db = getAdminDb();
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    Promise.all([db.from('events').select('*').order('starts_at', { ascending: false }), db.from('settings').select('events_enabled').eq('id', 1).maybeSingle()]).then(
      ([e, s]) => {
        setEvents((e.data ?? []) as EventItem[]);
        setEnabled(Boolean(s.data?.events_enabled));
      },
    );
  }, [db]);

  async function setOn(v: boolean) {
    setEnabled(v);
    await db.from('settings').update({ events_enabled: v }).eq('id', 1);
    publish();
  }

  async function create() {
    const start = new Date();
    start.setDate(start.getDate() + 14);
    start.setHours(18, 0, 0, 0);
    const { data, error } = await db
      .from('events')
      .insert({ slug: `event-${Date.now().toString(36)}`, title: { en: 'New event' }, starts_at: start.toISOString(), published: false })
      .select('id')
      .single();
    if (error) return window.alert(error.message);
    router.push(`/admin/events/${data.id}`);
  }

  useNewFromLink(create, Boolean(events));
  if (!events) return <Loading />;
  const now = Date.now();
  const end = (e: EventItem) => new Date(e.ends_at ?? e.starts_at).getTime();
  const upcoming = events.filter((e) => end(e) >= now).reverse();
  const past = events.filter((e) => end(e) < now);

  const list = (rows: EventItem[]) => (
    <ul className="mb-10 divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-white">
      {rows.map((e) => (
        <li key={e.id}>
          <Link href={`/admin/events/${e.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-[var(--color-pearl)]">
            <span className="flex-1">
              <span className="font-display block text-xl">{show(e.title)}</span>
              <span className="text-xs text-[var(--color-stone)]">
                {when(e.starts_at)}
                {e.location && ` · ${e.location}`}
              </span>
            </span>
            {!e.published && <Badge tone="dark">Draft</Badge>}
          </Link>
        </li>
      ))}
      {rows.length === 0 && <li className="p-4 text-sm text-[var(--color-stone)]">None.</li>}
    </ul>
  );

  return (
    <div>
      <PageTitle title="Events">
        <Button tone="dark" onClick={create}>New event</Button>
      </PageTitle>
      <div className="mb-6 max-w-xl">
        <Toggle label="Show Events on the site" checked={enabled} onChange={setOn} hint="Off: the Events page and menu link disappear. Your events stay saved here." />
      </div>
      <Help>Upcoming events also appear on the homepage. Past events stay on the Events page under “Past”.</Help>
      <h2 className="eyebrow mb-3">Upcoming</h2>
      {list(upcoming)}
      <h2 className="eyebrow mb-3">Past</h2>
      {list(past)}
    </div>
  );
}
