import ICAL from 'ical.js';
import { TZ, addDays, zonedClock, zonedDate, zonedTime } from './booking';

/**
 * Reading and writing iCalendar (.ics) text: the format iCloud, the iPhone and
 * school planners all speak. Parsing, time zones and repeating events are
 * left to ical.js; this file turns them into plain objects and back.
 */

export interface Occurrence {
  uid: string;
  /** Set on one occurrence of a repeating event (its original start, as ICS text). */
  recurrenceId: string | null;
  recurring: boolean;
  start: number;
  end: number;
  allDay: boolean;
  /** For all-day events: first and last day (inclusive), Brussels dates. */
  startDate: string;
  endDate: string;
  title: string;
  location: string;
  notes: string;
}

/** What the admin edits. Times are Brussels dates and clocks. */
export interface EventInput {
  title: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  notes: string;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Minutes before the start for an iPhone alert; null for none. */
  alarmMin: number | null;
}

const MAX_OCCURRENCES = 2000;

function toMs(t: ICAL.Time): number {
  const floating = !t.zone || t.zone === ICAL.Timezone.localTimezone || t.zone.tzid === 'floating';
  if (t.isDate) return zonedTime(`${t.year}-${p2(t.month)}-${p2(t.day)}`, '00:00');
  if (floating) return zonedTime(`${t.year}-${p2(t.month)}-${p2(t.day)}`, `${p2(t.hour)}:${p2(t.minute)}`);
  return t.toUnixTime() * 1000;
}

const p2 = (n: number) => String(n).padStart(2, '0');
const dateOf = (t: ICAL.Time) => `${t.year}-${p2(t.month)}-${p2(t.day)}`;

function parseCalendar(text: string): ICAL.Component | null {
  try {
    const comp = new ICAL.Component(ICAL.parse(text));
    for (const tz of comp.getAllSubcomponents('vtimezone')) {
      const id = String(tz.getFirstPropertyValue('tzid') ?? '');
      if (id && !ICAL.TimezoneService.has(id)) ICAL.TimezoneService.register(new ICAL.Timezone({ component: tz, tzid: id }));
    }
    return comp;
  } catch {
    return null;
  }
}

/** Every occurrence of every event in an .ics text that overlaps [from, to). */
export function occurrences(text: string, from: number, to: number): Occurrence[] {
  const cal = parseCalendar(text);
  if (!cal) return [];
  const vevents = cal.name === 'vevent' ? [cal] : cal.getAllSubcomponents('vevent');
  const byUid = new Map<string, { master?: ICAL.Component; exceptions: ICAL.Component[] }>();
  for (const v of vevents) {
    const uid = String(v.getFirstPropertyValue('uid') ?? Math.random());
    const g = byUid.get(uid) ?? { exceptions: [] };
    if (v.hasProperty('recurrence-id')) g.exceptions.push(v);
    else g.master = v;
    byUid.set(uid, g);
  }

  const out: Occurrence[] = [];
  for (const [uid, g] of byUid) {
    const base = g.master ?? g.exceptions[0];
    if (!base) continue;
    const event = new ICAL.Event(base);
    if (g.master) for (const ex of g.exceptions) event.relateException(ex);
    const add = (start: ICAL.Time, end: ICAL.Time, item: ICAL.Event, recurrenceId: string | null) => {
      const s = toMs(start);
      let e = toMs(end);
      if (e <= s) e = s + (start.isDate ? 86400_000 : 0);
      if (e <= from || s >= to) return;
      const status = String(item.component.getFirstPropertyValue('status') ?? '').toUpperCase();
      if (status === 'CANCELLED') return;
      const transp = String(item.component.getFirstPropertyValue('transp') ?? '').toUpperCase();
      out.push({
        uid,
        recurrenceId,
        recurring: event.isRecurring(),
        start: s,
        end: e,
        allDay: start.isDate,
        startDate: start.isDate ? dateOf(start) : zonedDate(s),
        endDate: start.isDate ? addDays(dateOf(end), -1) < dateOf(start) ? dateOf(start) : addDays(dateOf(end), -1) : zonedDate(e - 1),
        title: String(item.summary ?? ''),
        location: String(item.location ?? ''),
        notes: String(item.description ?? ''),
        ...(transp === 'TRANSPARENT' ? { transparent: true } : {}),
      } as Occurrence);
    };

    if (!event.isRecurring()) {
      if (event.startDate) add(event.startDate, event.endDate ?? event.startDate, event, null);
      continue;
    }
    const it = event.iterator();
    let next: ICAL.Time | null;
    let n = 0;
    while ((next = it.next()) && n++ < MAX_OCCURRENCES) {
      if (toMs(next) >= to) break;
      const d = event.getOccurrenceDetails(next);
      add(d.startDate, d.endDate, d.item, d.recurrenceId.toString());
    }
  }
  return out;
}

/** Is this occurrence marked "free" (does not block time)? */
export const isTransparent = (o: Occurrence) => (o as Occurrence & { transparent?: boolean }).transparent === true;

/* Writing ---------------------------------------------------------------- */

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

function utcStamp(t: number): string {
  return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Fold long lines at 75 octets, as the format requires. */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i ? ' ' : '') + line.slice(i, i + 73));
  return parts.join('\r\n');
}

const RRULE: Record<Exclude<EventInput['repeat'], 'none'>, string> = {
  daily: 'FREQ=DAILY',
  weekly: 'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
  yearly: 'FREQ=YEARLY',
};

/** The VEVENT lines for an event (times written in UTC, which every app shows in local time). */
function eventLines(uid: string, e: EventInput, now: number, extra: string[] = []): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${utcStamp(now)}`];
  if (e.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${e.startDate.replace(/-/g, '')}`);
    lines.push(`DTEND;VALUE=DATE:${addDays(e.endDate < e.startDate ? e.startDate : e.endDate, 1).replace(/-/g, '')}`);
  } else {
    const s = zonedTime(e.startDate, e.startTime);
    let en = zonedTime(e.endDate || e.startDate, e.endTime || e.startTime);
    if (en <= s) en = s + 3600_000;
    lines.push(`DTSTART:${utcStamp(s)}`, `DTEND:${utcStamp(en)}`);
  }
  lines.push(`SUMMARY:${esc(e.title || '(no title)')}`);
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
  if (e.notes) lines.push(`DESCRIPTION:${esc(e.notes)}`);
  if (e.repeat !== 'none') lines.push(`RRULE:${RRULE[e.repeat]}`);
  lines.push(...extra);
  if (e.alarmMin != null) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title || 'Reminder')}`, `TRIGGER:-PT${Math.max(0, Math.round(e.alarmMin))}M`, 'END:VALARM');
  }
  lines.push('END:VEVENT');
  return lines;
}

function wrap(lines: string[]): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//58 Diamonds//Website//EN', 'CALSCALE:GREGORIAN', ...lines, 'END:VCALENDAR', '']
    .map(fold)
    .join('\r\n');
}

/** A whole new calendar object with one event. */
export function buildEvent(uid: string, e: EventInput, now = Date.now(), extra: string[] = []): string {
  return wrap(eventLines(uid, e, now, extra));
}

/** The editable fields of the event behind an .ics text (its main event, or one occurrence). */
export function readEvent(text: string, recurrenceId: string | null): (EventInput & { uid: string }) | null {
  const cal = parseCalendar(text);
  if (!cal) return null;
  const vevents = cal.getAllSubcomponents('vevent');
  const v =
    (recurrenceId && vevents.find((x) => String(x.getFirstPropertyValue('recurrence-id') ?? '') === recurrenceId)) ||
    vevents.find((x) => !x.hasProperty('recurrence-id')) ||
    vevents[0];
  if (!v) return null;
  const ev = new ICAL.Event(v);
  const allDay = ev.startDate.isDate;
  const s = toMs(ev.startDate);
  const e = toMs(ev.endDate ?? ev.startDate);
  const rule = String((v.getFirstPropertyValue('rrule') as ICAL.Recur | null)?.freq ?? '').toLowerCase();
  const alarm = v.getFirstSubcomponent('valarm');
  const trig = alarm?.getFirstPropertyValue('trigger') as ICAL.Duration | null | undefined;
  return {
    uid: ev.uid,
    title: ev.summary ?? '',
    allDay,
    startDate: allDay ? dateOf(ev.startDate) : zonedDate(s),
    startTime: allDay ? '' : zonedClock(s),
    endDate: allDay ? addDays(dateOf(ev.endDate ?? ev.startDate), -1) : zonedDate(e),
    endTime: allDay ? '' : zonedClock(e),
    location: ev.location ?? '',
    notes: ev.description ?? '',
    repeat: (['daily', 'weekly', 'monthly', 'yearly'] as const).find((r) => r === rule) ?? 'none',
    alarmMin: trig && typeof trig.toSeconds === 'function' ? Math.round(Math.abs(trig.toSeconds()) / 60) : null,
  };
}

/**
 * Apply an edit to an existing .ics text and return the new text.
 * scope 'all' rewrites the main event (keeping its other occurrences' changes);
 * scope 'one' writes a change for a single occurrence of a repeating event.
 */
export function editEvent(text: string, input: EventInput, scope: 'all' | 'one', recurrenceId: string | null, now = Date.now()): string {
  const cal = parseCalendar(text);
  if (!cal) throw new Error('Unreadable event');
  const vevents = cal.getAllSubcomponents('vevent');
  const master = vevents.find((x) => !x.hasProperty('recurrence-id')) ?? vevents[0];
  const uid = String(master.getFirstPropertyValue('uid'));
  const keep = (v: ICAL.Component) => v.toString().split(/\r?\n/);

  if (scope === 'one' && recurrenceId) {
    const others = vevents.filter((x) => String(x.getFirstPropertyValue('recurrence-id') ?? '') !== recurrenceId);
    const rid = master.getFirstPropertyValue('dtstart') as ICAL.Time;
    const ridLine = rid?.isDate ? `RECURRENCE-ID;VALUE=DATE:${recurrenceId.replace(/-/g, '').slice(0, 8)}` : `RECURRENCE-ID:${utcStamp(ridToMs(recurrenceId))}`;
    const override = eventLines(uid, { ...input, repeat: 'none' }, now, [ridLine]);
    return wrap([...cal.getAllSubcomponents('vtimezone').flatMap(keep), ...others.flatMap(keep), ...override]);
  }
  // Skipped and changed occurrences are kept by their day, at the series' new time.
  const at = (date: string) => (input.allDay ? `;VALUE=DATE:${date.replace(/-/g, '')}` : `:${utcStamp(zonedTime(date, input.startTime))}`);
  const dayOf = (t: ICAL.Time) => (t.isDate ? dateOf(t) : zonedDate(toMs(t)));
  const exdates = master.getAllProperties('exdate').flatMap((p) => p.getValues() as ICAL.Time[]);
  const extra = input.repeat === 'none' ? [] : [...new Set(exdates.map(dayOf))].map((d) => `EXDATE${at(d)}`);
  const exceptions =
    input.repeat === 'none'
      ? []
      : vevents
          .filter((x) => x !== master)
          .flatMap((x) => {
            const rid = x.getFirstPropertyValue('recurrence-id') as ICAL.Time;
            return keep(x).map((l) => (/^RECURRENCE-ID[;:]/i.test(l) ? `RECURRENCE-ID${at(dayOf(rid))}` : l));
          });
  const created = master.getFirstProperty('created')?.toICALString();
  const lines = eventLines(uid, input, now, [...extra, ...(created ? [created] : [])]);
  return wrap([...cal.getAllSubcomponents('vtimezone').flatMap(keep), ...lines, ...exceptions]);
}

/** Remove one occurrence of a repeating event (adds an exception date). */
export function skipOccurrence(text: string, recurrenceId: string): string {
  const cal = parseCalendar(text);
  if (!cal) throw new Error('Unreadable event');
  const vevents = cal.getAllSubcomponents('vevent');
  const master = vevents.find((x) => !x.hasProperty('recurrence-id')) ?? vevents[0];
  const start = master.getFirstPropertyValue('dtstart') as ICAL.Time;
  const ex = start.isDate ? `EXDATE;VALUE=DATE:${recurrenceId.replace(/-/g, '').slice(0, 8)}` : `EXDATE:${utcStamp(ridToMs(recurrenceId))}`;
  const others = vevents.filter((x) => x !== master && String(x.getFirstPropertyValue('recurrence-id') ?? '') !== recurrenceId);
  const lines = master.toString().split(/\r?\n/);
  lines.splice(lines.length - 1, 0, ex);
  return wrap([...cal.getAllSubcomponents('vtimezone').flatMap((v) => v.toString().split(/\r?\n/)), ...lines, ...others.flatMap((v) => v.toString().split(/\r?\n/))]);
}

/** An occurrence id (ICAL.Time string such as 2026-10-14T09:00:00Z or a floating time) as epoch ms. */
function ridToMs(rid: string): number {
  const t = ICAL.Time.fromString(rid, null);
  return toMs(t);
}

/** Is a calendar date string valid (YYYY-MM-DD)? */
export const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Brussels time zone name, for display. */
export const ZONE_LABEL = TZ;
