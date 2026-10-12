'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, ImageField, L10nField, Loading, MARKDOWN_HINT, PageTitle, SaveBar, TextField, Toggle, inputCls, show, useSave } from '@/components/admin/ui';
import { publish } from '@/lib/admin-client';
import { slugify } from '@/lib/format';
import { getAdminDb } from '@/lib/supabase';
import type { EventItem } from '@/lib/types';

/** ISO time to the value of a datetime-local input, in the browser's time zone. */
function toLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

export default function EventEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const db = getAdminDb();
  const [ev, setEv] = useState<EventItem | null>(null);
  const { state, run, setState } = useSave();

  useEffect(() => {
    db.from('events').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (!data) return router.replace('/admin/events');
      setEv(data as EventItem);
    });
  }, [db, id, router]);

  if (!ev) return <Loading />;
  const set = (patch: Partial<EventItem>) => setEv({ ...ev, ...patch });
  const slug = slugify(ev.slug) || slugify(show(ev.title));

  async function save() {
    if (!slug) return setState({ error: 'Give the event a web address.' });
    if (ev!.ends_at && ev!.ends_at < ev!.starts_at) return setState({ error: 'The end is before the start.' });
    const ok = await run(async () =>
      db
        .from('events')
        .update({
          slug,
          title: ev!.title,
          starts_at: ev!.starts_at,
          ends_at: ev!.ends_at,
          location: ev!.location,
          summary: ev!.summary,
          body: ev!.body,
          image_url: ev!.image_url,
          link_url: ev!.link_url || null,
          published: ev!.published,
        })
        .eq('id', id),
    );
    if (ok) set({ slug });
  }

  async function remove() {
    if (!window.confirm(`Delete “${show(ev!.title)}”? This cannot be undone.`)) return;
    await db.from('events').delete().eq('id', id);
    publish();
    router.replace('/admin/events');
  }

  return (
    <div>
      <PageTitle title={show(ev.title) || 'Event'} back={{ href: '/admin/events', label: 'Events' }} />
      <div className="grid gap-6">
        <Card title="Event">
          <div className="grid gap-5">
            <L10nField label="Name" value={ev.title} onChange={(title) => set({ title })} />
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm">Starts</span>
                <input type="datetime-local" value={toLocal(ev.starts_at)} onChange={(e) => e.target.value && set({ starts_at: fromLocal(e.target.value)! })} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm">Ends (optional)</span>
                <input type="datetime-local" value={toLocal(ev.ends_at)} onChange={(e) => set({ ends_at: fromLocal(e.target.value) })} className={inputCls} />
              </label>
            </div>
            <TextField label="Place" value={ev.location} onChange={(location) => set({ location })} placeholder="Hotel, city" />
            <L10nField label="Short description" value={ev.summary} onChange={(summary) => set({ summary })} multiline rows={2} hint="Shown on the event cards." />
            <L10nField label="Full text" value={ev.body} onChange={(body) => set({ body })} multiline rows={10} hint={MARKDOWN_HINT} />
            <ImageField label="Photo" value={ev.image_url} onChange={(image_url) => set({ image_url })} folder="events" aspect="aspect-[4/3]" />
            <TextField label="Link (optional)" value={ev.link_url ?? ''} onChange={(link_url) => set({ link_url })} placeholder="https://..." hint="Tickets or the organiser's page." />
          </div>
        </Card>
        <Card title="On the site">
          <div className="grid gap-5">
            <Toggle label="Published" checked={ev.published} onChange={(published) => set({ published })} />
            <TextField label="Web address" value={ev.slug} onChange={(v) => set({ slug: v })} hint={`/events/${slug || '...'}`} />
          </div>
        </Card>
      </div>
      <SaveBar state={state} onSave={save}>
        <Button tone="danger" onClick={remove}>Delete event</Button>
      </SaveBar>
    </div>
  );
}
