'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, Help, Loading, NumberField, PageTitle, SaveBar, SelectField, TextField, Toggle, inputCls, useSave } from '@/components/admin/ui';
import { adminFetch } from '@/lib/admin-client';
import { toConfig, type BookingConfig, type IcsLink } from '@/lib/booking';
import { getAdminDb } from '@/lib/supabase';

interface Cal {
  href: string;
  name: string;
  color: string | null;
  readOnly: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MISSING: Record<string, string> = {
  icloud: "Farah's Apple ID and app-specific password are not set in Vercel yet (ICLOUD_USERNAME, ICLOUD_APP_PASSWORD).",
  email: 'Email sending is not set up yet (Resend), so clients would get no confirmation.',
  hours: 'No opening hours yet: set at least one day to "Opening hours" below.',
  switch: 'Online booking is switched off below.',
};

/** Opening hours, appointment length, which calendars count as busy, school links. */
export default function BookingSettings() {
  const db = getAdminDb();
  const [c, setC] = useState<BookingConfig | null>(null);
  const [cals, setCals] = useState<Cal[] | null>(null);
  const [status, setStatus] = useState<{ icloud: boolean; error: string | null; missing: string[] } | null>(null);
  const [newDate, setNewDate] = useState('');
  const { state, run } = useSave();

  useEffect(() => {
    db.from('booking_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setC(toConfig(data)));
    adminFetch('/api/admin/agenda', { action: 'status' })
      .then((r) => {
        setCals((r.calendars as Cal[]) ?? []);
        setStatus({ icloud: Boolean(r.icloud), error: (r.error as string | null) ?? null, missing: (r.missing as string[]) ?? [] });
      })
      .catch((e: Error) => setStatus({ icloud: false, error: e.message, missing: [] }));
  }, [db]);

  if (!c) return <Loading />;
  const set = (patch: Partial<BookingConfig>) => setC({ ...c, ...patch });
  const ranges = (d: number) => c.hours[String(d)] ?? [];
  const setRanges = (d: number, r: [string, string][]) => set({ hours: { ...c.hours, [String(d)]: r } });
  const setLink = (i: number, patch: Partial<IcsLink>) => set({ ics_links: c.ics_links.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const own = (cals ?? []).filter((x) => x.name !== '58 Diamonds requests' && x.name !== '58 Diamonds to do');
  const busySet = new Set(c.busy_calendars ?? own.map((x) => x.href));

  async function save() {
    const v = c!;
    const clean = Object.fromEntries(Object.entries(v.hours).map(([d, r]) => [d, r.filter(([a, b]) => a && b && b > a)]));
    await run(async () => {
      const res = await db
        .from('booking_settings')
        .update({
          enabled: v.enabled,
          duration_min: v.duration_min,
          buffer_min: v.buffer_min,
          notice_hours: v.notice_hours,
          horizon_weeks: v.horizon_weeks,
          step_min: v.step_min,
          hours: clean,
          closed_dates: [...new Set(v.closed_dates)].sort(),
          busy_calendars: v.busy_calendars,
          main_calendar: v.main_calendar,
          ics_links: v.ics_links.filter((l) => l.url.trim()).map((l) => ({ ...l, url: l.url.trim(), name: l.name.trim() || 'Calendar link' })),
          auto_release_hours: v.auto_release_hours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
      if (!res.error) {
        const r = await adminFetch('/api/admin/agenda', { action: 'status' }).catch(() => null);
        if (r) setStatus({ icloud: Boolean(r.icloud), error: (r.error as string | null) ?? null, missing: (r.missing as string[]) ?? [] });
      }
      return res;
    });
  }

  return (
    <div>
      <PageTitle title="Booking calendar" />
      <Help>
        Clients pick a free time on the Book an appointment page. Free times are your opening hours minus everything in your iPhone calendars, school links and other bookings. Every request waits for your approval: it is held in a "58 Diamonds requests" calendar on your iPhone until you approve or decline it.
      </Help>

      <Card title="Status" className="mb-6">
        {!status ? (
          <Loading />
        ) : status.missing.length === 0 ? (
          <p className="text-sm">
            <Badge tone="gold">Live</Badge> Clients can book online.
          </p>
        ) : (
          <>
            <p className="text-sm">
              <Badge tone="warn">Not live yet</Badge> The contact page shows the plain request form until these are done:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {status.missing.map((m) => (
                <li key={m}>{MISSING[m] ?? m}</li>
              ))}
            </ul>
          </>
        )}
        {status?.error && <p className="mt-3 text-sm text-red-800">iCloud: {status.error}</p>}
        {status?.icloud && !status.error && cals && <p className="mt-3 text-sm text-[var(--color-stone)]">Connected to iCloud: {cals.length} calendars found.</p>}
      </Card>

      <div className="space-y-6">
        <Card title="Online booking">
          <Toggle label="Clients can book online" checked={c.enabled} onChange={(enabled) => set({ enabled })} hint="Off: the contact page keeps the plain request form." />
        </Card>

        <Card title="Opening hours">
          <p className="mb-4 text-sm text-[var(--color-stone)]">Brussels time. A day can have several blocks, for example 10:00 to 13:00 and 14:00 to 18:00. On a day set to "By appointment only", clients see no times but can pick the day in the calendar and send a request for it; you then propose a time.</p>
          <div className="space-y-4">
            {DAYS.map((name, i) => {
              const d = i + 1;
              return (
                <div key={d} className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] pb-3">
                  <span className="w-28 text-sm">{name}</span>
                  <select
                    aria-label={`${name}: opening hours or by appointment only`}
                    value={ranges(d).length ? 'hours' : 'appointment'}
                    onChange={(e) => setRanges(d, e.target.value === 'hours' ? [['10:00', '18:00']] : [])}
                    className={`${inputCls} mt-0 w-auto`}
                  >
                    <option value="hours">Opening hours</option>
                    <option value="appointment">By appointment only</option>
                  </select>
                  {ranges(d).map(([a, b], j) => (
                    <span key={j} className="flex items-center gap-1">
                      <input type="time" value={a} aria-label={`${name} from`} onChange={(e) => setRanges(d, ranges(d).map((r, k) => (k === j ? [e.target.value, r[1]] : r)))} className={`${inputCls} mt-0 w-28`} />
                      <span className="text-sm">to</span>
                      <input type="time" value={b} aria-label={`${name} until`} onChange={(e) => setRanges(d, ranges(d).map((r, k) => (k === j ? [r[0], e.target.value] : r)))} className={`${inputCls} mt-0 w-28`} />
                      <Button label="Remove these hours" onClick={() => setRanges(d, ranges(d).filter((_, k) => k !== j))}>
                        ×
                      </Button>
                    </span>
                  ))}
                  {ranges(d).length > 0 && <Button onClick={() => setRanges(d, [...ranges(d), ['14:00', '18:00']])}>Add hours</Button>}
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Appointments">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Length (minutes)" value={c.duration_min} min={15} step={15} onChange={(v) => set({ duration_min: v ?? 60 })} />
            <NumberField label="Free time between appointments (minutes)" value={c.buffer_min} step={5} onChange={(v) => set({ buffer_min: v ?? 0 })} />
            <SelectField
              label="Start times every"
              value={String(c.step_min) as '15' | '30' | '60'}
              onChange={(v) => set({ step_min: Number(v) })}
              options={[
                { value: '15', label: '15 minutes' },
                { value: '30', label: '30 minutes' },
                { value: '60', label: 'hour' },
              ]}
            />
            <NumberField label="Book at least this many hours ahead" value={c.notice_hours} onChange={(v) => set({ notice_hours: v ?? 0 })} />
            <NumberField label="Book at most this many weeks ahead" value={c.horizon_weeks} min={1} onChange={(v) => set({ horizon_weeks: v ?? 8 })} />
            <NumberField
              label="Free a request I have not answered after (hours)"
              value={c.auto_release_hours}
              min={1}
              onChange={(v) => set({ auto_release_hours: v })}
              hint="Leave empty to keep it until you answer. You get one reminder after 48 hours."
            />
          </div>
        </Card>

        <Card title="Closed days">
          <p className="mb-3 text-sm text-[var(--color-stone)]">Holidays, fairs and other days nobody can book, on top of what is in your calendar.</p>
          <div className="flex flex-wrap items-end gap-2">
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} aria-label="Closed day" className={`${inputCls} w-44`} />
            <Button
              onClick={() => {
                if (newDate) set({ closed_dates: [...c.closed_dates, newDate] });
                setNewDate('');
              }}
            >
              Add
            </Button>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[...c.closed_dates].sort().map((d) => (
              <li key={d}>
                <Button label={`Remove ${d}`} onClick={() => set({ closed_dates: c.closed_dates.filter((x) => x !== d) })}>
                  {new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} ×
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Your iPhone calendars">
          {!cals ? (
            <Loading />
          ) : own.length === 0 ? (
            <p className="text-sm text-[var(--color-stone)]">No calendars found yet. They appear here once iCloud is connected.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-[var(--color-stone)]">Ticked calendars block appointment times. All-day events (birthdays, holidays) never block.</p>
              <div className="space-y-1">
                {own.map((x) => (
                  <Toggle
                    key={x.href}
                    label={x.name}
                    checked={busySet.has(x.href)}
                    onChange={(on) => {
                      const next = new Set(busySet);
                      if (on) next.add(x.href);
                      else next.delete(x.href);
                      set({ busy_calendars: [...next] });
                    }}
                  />
                ))}
              </div>
              <div className="mt-5 max-w-sm">
                <SelectField
                  label="Approved appointments go to"
                  value={c.main_calendar ?? ''}
                  onChange={(v) => set({ main_calendar: v || null })}
                  options={[{ value: '', label: 'Choose automatically' }, ...own.filter((x) => !x.readOnly).map((x) => ({ value: x.href, label: x.name }))]}
                />
              </div>
            </>
          )}
        </Card>

        <Card title="Calendar links (school and others)">
          <p className="mb-4 text-sm text-[var(--color-stone)]">
            For calendars you only subscribe to, such as Smartschool. In the Smartschool Planner: gear icon, then Share planner (ICS export) or Planner delen (ICS-export); copy the link and paste it here. These are read-only and show greyed in your Agenda.
          </p>
          <div className="space-y-4">
            {c.ics_links.map((l, i) => (
              <div key={i} className="grid gap-3 border-b border-[var(--color-line)] pb-4 sm:grid-cols-[1fr_2fr_auto]">
                <TextField label="Name" value={l.name} onChange={(name) => setLink(i, { name })} placeholder="Smartschool" />
                <TextField label="Link" value={l.url} onChange={(url) => setLink(i, { url })} placeholder="https://..." />
                <div className="pt-6">
                  <Button tone="danger" onClick={() => set({ ics_links: c.ics_links.filter((_, j) => j !== i) })}>
                    Remove
                  </Button>
                </div>
                <div className="sm:col-span-3">
                  <Toggle label="Blocks appointment times" checked={l.busy} onChange={(busy) => setLink(i, { busy })} />
                  <Toggle label="All-day events block the whole day" checked={l.allday_blocks} onChange={(allday_blocks) => setLink(i, { allday_blocks })} hint="Off: school holidays and study days show in the Agenda but do not block." />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button onClick={() => set({ ics_links: [...c.ics_links, { name: '', url: '', busy: true, allday_blocks: false }] })}>Add a link</Button>
          </div>
        </Card>
      </div>

      <SaveBar state={state} onSave={save} />
    </div>
  );
}
