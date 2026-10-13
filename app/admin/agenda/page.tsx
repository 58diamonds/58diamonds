'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, FormActions, Help, Loading, PageTitle, SelectField, TextField, Toggle, inputCls } from '@/components/admin/ui';
import { adminFetch } from '@/lib/admin-client';
import { addDays, weekday, zonedDate, zonedTime } from '@/lib/booking';
import type { EventInput } from '@/lib/ics';
import { askConfirm } from '@/components/admin/confirm';

interface Item {
  uid: string;
  recurrenceId: string | null;
  recurring: boolean;
  start: number;
  end: number;
  allDay: boolean;
  startDate: string;
  endDate: string;
  title: string;
  location: string;
  notes: string;
  source: 'icloud' | 'link' | 'booking';
  calendar?: string;
  calendarName?: string;
  href?: string;
  etag?: string;
  readOnly: boolean;
  color?: string | null;
  bookingId?: string;
  status?: string;
}

interface Cal {
  href: string;
  name: string;
  color: string | null;
  readOnly: boolean;
}

const TZ = 'Europe/Brussels';
const clock = (t: number) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(t);
const dayLabel = (d: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(Date.parse(`${d}T12:00:00Z`));
const monday = (d: string) => addDays(d, 1 - weekday(d));

/** The days an item shows on (an all-day event over three days shows on each). */
function daysOf(i: Item): string[] {
  const first = i.allDay ? i.startDate : zonedDate(i.start);
  const last = i.allDay ? i.endDate : zonedDate(Math.max(i.start, i.end - 1));
  const out: string[] = [];
  for (let d = first; d <= last && out.length < 62; d = addDays(d, 1)) out.push(d);
  return out;
}

type Editing = { item: Item | null; event: EventInput; calendar: string; etag: string; scope: 'one' | 'all' };

const ALERTS = [
  { value: '', label: 'No alert' },
  { value: '0', label: 'At the start' },
  { value: '15', label: '15 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
];

/** Farah's whole agenda: her iPhone calendars, school links and bookings. */
export default function Agenda() {
  const today = zonedDate(Date.now());
  const [view, setView] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(today);
  const [items, setItems] = useState<Item[] | null>(null);
  const [cals, setCals] = useState<Cal[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [viewing, setViewing] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const range = useMemo(() => {
    if (view === 'week') {
      const s = monday(anchor);
      return { first: s, last: addDays(s, 6) };
    }
    const first = monday(`${anchor.slice(0, 7)}-01`);
    const monthEnd = addDays(`${addDays(`${anchor.slice(0, 7)}-28`, 4).slice(0, 7)}-01`, -1);
    return { first, last: addDays(monday(monthEnd), 6) };
  }, [view, anchor]);

  const load = useCallback(
    async (fresh = false) => {
      setItems(null);
      try {
        const r = await adminFetch('/api/admin/agenda', {
          action: 'list',
          from: zonedTime(range.first, '00:00'),
          to: zonedTime(addDays(range.last, 1), '00:00'),
          fresh,
        });
        setItems(r.items as Item[]);
        setCals(r.calendars as Cal[]);
        setErrors((r.errors as string[]) ?? []);
      } catch (e) {
        setItems([]);
        setErrors([e instanceof Error ? e.message : String(e)]);
      }
    },
    [range],
  );

  useEffect(() => {
    load();
  }, [load]);

  const writable = cals.filter((c) => !c.readOnly && c.name !== '58 Diamonds requests');
  const byDay = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of items ?? []) for (const d of daysOf(i)) m.set(d, [...(m.get(d) ?? []), i]);
    for (const list of m.values()) list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start - b.start);
    return m;
  }, [items]);

  function step(n: number) {
    if (view === 'week') setAnchor(addDays(anchor, 7 * n));
    else {
      const [y, m] = anchor.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1 + n, 1));
      setAnchor(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`);
    }
  }

  function newEvent(date = anchor) {
    setProblem(null);
    setEditing({
      item: null,
      calendar: writable.find((c) => /^(calendar|agenda|home|thuis|calendrier)$/i.test(c.name))?.href ?? writable[0]?.href ?? '',
      etag: '',
      scope: 'all',
      event: { title: '', allDay: false, startDate: date, startTime: '10:00', endDate: date, endTime: '11:00', location: '', notes: '', repeat: 'none', alarmMin: null },
    });
  }

  async function open(i: Item) {
    setProblem(null);
    if (i.source !== 'icloud' || i.readOnly || !i.href) return setViewing(i);
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/agenda', { action: 'get', href: i.href, recurrenceId: i.recurrenceId });
      const ev = r.event as EventInput;
      // Editing one occurrence: show that occurrence's own date and time.
      const one = i.recurring && i.recurrenceId;
      setEditing({
        item: i,
        calendar: i.calendar ?? '',
        etag: String(r.etag ?? ''),
        scope: one ? 'one' : 'all',
        event: one
          ? { ...ev, startDate: i.allDay ? i.startDate : zonedDate(i.start), startTime: i.allDay ? '' : clock(i.start), endDate: i.allDay ? i.endDate : zonedDate(i.end), endTime: i.allDay ? '' : clock(i.end) }
          : ev,
      });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setProblem(null);
    try {
      const e = editing.event;
      const event = { ...e, endDate: e.endDate || e.startDate, startTime: e.allDay ? '' : e.startTime, endTime: e.allDay ? '' : e.endTime };
      await adminFetch(
        '/api/admin/agenda',
        editing.item
          ? { action: 'save', href: editing.item.href, etag: editing.etag, event, scope: editing.scope, recurrenceId: editing.item.recurrenceId }
          : { action: 'save', calendar: editing.calendar, event },
      );
      setEditing(null);
      load(true);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing?.item) return;
    const what = editing.item.recurring && editing.scope === 'one' ? 'this occurrence' : editing.item.recurring ? 'every occurrence of this event' : 'this event';
    if (!(await askConfirm(`Delete ${what}? It disappears from your iPhone too.`))) return;
    setBusy(true);
    try {
      await adminFetch('/api/admin/agenda', { action: 'delete', href: editing.item.href, etag: editing.etag, scope: editing.scope, recurrenceId: editing.item.recurrenceId });
      setEditing(null);
      load(true);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const chip = (i: Item, compact = false) => (
    <button
      key={`${i.uid}-${i.recurrenceId ?? ''}-${i.start}`}
      type="button"
      onClick={() => open(i)}
      className={`flex w-full items-start gap-2 px-2 py-1 text-left text-[0.8rem] leading-snug transition hover:bg-[var(--color-pearl)] ${i.source === 'link' ? 'text-[var(--color-stone)]' : ''} ${i.source === 'booking' ? 'bg-[#f3ead9]' : ''}`}
    >
      <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: i.color ?? '#8a6a3b' }} />
      <span className="min-w-0">
        {!i.allDay && <span className="mr-1 tabular-nums text-[var(--color-stone)]">{clock(i.start)}</span>}
        <span className={compact ? 'line-clamp-1' : ''}>{i.title || '(no title)'}</span>
        {i.source === 'booking' && !compact && (
          <span className="ml-1">
            <Badge tone={i.status === 'pending' ? 'warn' : 'gold'}>{i.status === 'pending' ? 'To approve' : 'Booked'}</Badge>
          </span>
        )}
      </span>
    </button>
  );

  const title =
    view === 'week'
      ? `${dayLabel(range.first, { day: 'numeric', month: 'short' })} to ${dayLabel(range.last, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : dayLabel(`${anchor.slice(0, 7)}-15`, { month: 'long', year: 'numeric' });

  return (
    <div>
      <PageTitle title="Agenda">
        <Button tone="dark" onClick={() => newEvent()} disabled={!writable.length}>
          Add event
        </Button>
      </PageTitle>
      <Help>
        Everything in your iPhone calendars, your school links (grey, read-only) and website bookings (gold). Changes here show on your iPhone within a minute; changes on the iPhone show here after Refresh. Opening hours and which calendars count are in <Link href="/admin/booking" className="underline underline-offset-4">Booking calendar</Link>.
      </Help>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => step(-1)} label="Previous">‹</Button>
        <Button onClick={() => setAnchor(today)}>Today</Button>
        <Button onClick={() => step(1)} label="Next">›</Button>
        <p className="font-display mx-2 text-2xl">{title}</p>
        <span className="ml-auto flex gap-2">
          <Button onClick={() => setView('week')} tone={view === 'week' ? 'dark' : 'quiet'}>Week</Button>
          <Button onClick={() => setView('month')} tone={view === 'month' ? 'dark' : 'quiet'}>Month</Button>
          <Button onClick={() => load(true)}>Refresh</Button>
        </span>
      </div>

      {errors.length > 0 && <p className="mb-4 text-sm text-red-800">{errors.join(' ')}</p>}
      {problem && !editing && <p className="mb-4 text-sm text-red-800">{problem}</p>}

      {!items ? (
        <Loading />
      ) : view === 'week' ? (
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, k) => addDays(range.first, k)).map((d) => (
            <section key={d} className={`min-h-28 border bg-white ${d === today ? 'border-[var(--color-gold)]' : 'border-[var(--color-line)]'}`}>
              <button type="button" onClick={() => newEvent(d)} className="block w-full border-b border-[var(--color-line)] px-2 py-1.5 text-left text-xs uppercase tracking-[0.12em] hover:bg-[var(--color-pearl)]" title="Add an event on this day">
                {dayLabel(d, { weekday: 'short', day: 'numeric', month: 'short' })}
              </button>
              <div className="py-1">{(byDay.get(d) ?? []).map((i) => chip(i))}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 border-l border-t border-[var(--color-line)] bg-white">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
            <span key={w} className="border-b border-r border-[var(--color-line)] px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-[var(--color-stone)]">
              {w}
            </span>
          ))}
          {(() => {
            const cells: string[] = [];
            for (let d = range.first; d <= range.last; d = addDays(d, 1)) cells.push(d);
            return cells.map((d) => {
              const list = byDay.get(d) ?? [];
              const inMonth = d.startsWith(anchor.slice(0, 7));
              return (
                <div key={d} className={`min-h-24 border-b border-r border-[var(--color-line)] ${inMonth ? '' : 'bg-[var(--color-ivory)] opacity-60'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setAnchor(d);
                      setView('week');
                    }}
                    className={`block px-2 pt-1 text-xs ${d === today ? 'font-semibold text-[var(--color-gold)]' : ''}`}
                  >
                    {Number(d.slice(8))}
                  </button>
                  {list.slice(0, 3).map((i) => chip(i, true))}
                  {list.length > 3 && (
                    <button type="button" className="px-2 text-xs text-[var(--color-stone)]" onClick={() => { setAnchor(d); setView('week'); }}>
                      +{list.length - 3} more
                    </button>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {viewing && (
        <Dialog title={viewing.title || '(no title)'} onClose={() => setViewing(null)}>
          <p className="text-sm text-[var(--color-stone)]">
            {viewing.allDay
              ? `${dayLabel(viewing.startDate, { weekday: 'long', day: 'numeric', month: 'long' })}${viewing.endDate !== viewing.startDate ? ` to ${dayLabel(viewing.endDate, { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}, all day`
              : `${dayLabel(zonedDate(viewing.start), { weekday: 'long', day: 'numeric', month: 'long' })}, ${clock(viewing.start)} to ${clock(viewing.end)}`}
          </p>
          <p className="mt-1 text-sm">{viewing.source === 'booking' ? 'Website booking' : viewing.calendarName}</p>
          {viewing.location && <p className="mt-3 text-sm">{viewing.location}</p>}
          {viewing.notes && <p className="mt-3 whitespace-pre-line text-sm">{viewing.notes}</p>}
          <p className="mt-4 text-xs text-[var(--color-stone)]">
            {viewing.source === 'booking' ? (
              <Link href="/admin/requests" className="underline underline-offset-4">Approve, decline or move it in Appointment requests</Link>
            ) : viewing.source === 'link' ? (
              'From a calendar link: change it at its source (for example Smartschool).'
            ) : (
              'This calendar is read-only.'
            )}
          </p>
        </Dialog>
      )}

      {editing && (
        <Dialog title={editing.item ? 'Edit event' : 'New event'} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            {editing.item?.recurring && (
              <SelectField
                label="This is a repeating event. Change"
                value={editing.scope}
                onChange={(scope) => setEditing({ ...editing, scope })}
                options={[
                  { value: 'one', label: 'Only this one' },
                  { value: 'all', label: 'Every occurrence' },
                ]}
              />
            )}
            <TextField label="Title" value={editing.event.title} onChange={(title) => setEditing({ ...editing, event: { ...editing.event, title } })} />
            {!editing.item && (
              <SelectField label="Calendar" value={editing.calendar} onChange={(calendar) => setEditing({ ...editing, calendar })} options={writable.map((c) => ({ value: c.href, label: c.name }))} />
            )}
            <Toggle label="All day" checked={editing.event.allDay} onChange={(allDay) => setEditing({ ...editing, event: { ...editing.event, allDay, startTime: editing.event.startTime || '10:00', endTime: editing.event.endTime || '11:00' } })} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                Starts
                <input type="date" value={editing.event.startDate} onChange={(e) => setEditing({ ...editing, event: { ...editing.event, startDate: e.target.value, endDate: editing.event.endDate < e.target.value ? e.target.value : editing.event.endDate } })} className={inputCls} />
              </label>
              {!editing.event.allDay ? (
                <label className="block text-sm">
                  at
                  <input type="time" value={editing.event.startTime} onChange={(e) => setEditing({ ...editing, event: { ...editing.event, startTime: e.target.value } })} className={inputCls} />
                </label>
              ) : (
                <span />
              )}
              <label className="block text-sm">
                Ends
                <input type="date" value={editing.event.endDate} min={editing.event.startDate} onChange={(e) => setEditing({ ...editing, event: { ...editing.event, endDate: e.target.value } })} className={inputCls} />
              </label>
              {!editing.event.allDay && (
                <label className="block text-sm">
                  at
                  <input type="time" value={editing.event.endTime} onChange={(e) => setEditing({ ...editing, event: { ...editing.event, endTime: e.target.value } })} className={inputCls} />
                </label>
              )}
            </div>
            <TextField label="Place" value={editing.event.location} onChange={(location) => setEditing({ ...editing, event: { ...editing.event, location } })} />
            <TextField label="Notes" multiline rows={3} value={editing.event.notes} onChange={(notes) => setEditing({ ...editing, event: { ...editing.event, notes } })} />
            {editing.scope === 'all' && (
              <SelectField
                label="Repeat"
                value={editing.event.repeat}
                onChange={(repeat) => setEditing({ ...editing, event: { ...editing.event, repeat } })}
                options={[
                  { value: 'none', label: 'Does not repeat' },
                  { value: 'daily', label: 'Every day' },
                  { value: 'weekly', label: 'Every week' },
                  { value: 'monthly', label: 'Every month' },
                  { value: 'yearly', label: 'Every year' },
                ]}
              />
            )}
            <SelectField
              label="Alert on the iPhone"
              value={editing.event.alarmMin == null ? '' : String(editing.event.alarmMin)}
              onChange={(v) => setEditing({ ...editing, event: { ...editing.event, alarmMin: v === '' ? null : Number(v) } })}
              options={ALERTS.some((a) => a.value === String(editing.event.alarmMin ?? '')) ? ALERTS : [...ALERTS, { value: String(editing.event.alarmMin), label: `${editing.event.alarmMin} minutes before` }]}
            />
            {problem && <p className="text-sm text-red-800" role="alert">{problem}</p>}
            <FormActions
              state={busy ? 'saving' : undefined}
              onSave={save}
              saveDisabled={!editing.event.startDate || (!editing.item && !editing.calendar)}
              onCancel={() => setEditing(null)}
              onDelete={editing.item ? remove : undefined}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-lg overflow-y-auto border border-[var(--color-line)] bg-[var(--color-ivory)] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-3xl">{title}</h2>
          <Button label="Close" onClick={onClose}>×</Button>
        </div>
        {children}
      </div>
    </div>
  );
}
