/**
 * Free appointment times, worked out from the opening hours minus everything
 * that is busy. Pure functions, no network: the server feeds them the busy
 * times it read from iCloud, the school links and the database.
 *
 * All opening hours and dates are Brussels wall-clock time; everything else is
 * real instants (Date / epoch ms), so summer and winter time are handled once,
 * in zonedTime().
 */

export const TZ = 'Europe/Brussels';

export interface BookingConfig {
  enabled: boolean;
  duration_min: number;
  buffer_min: number;
  notice_hours: number;
  horizon_weeks: number;
  step_min: number;
  /** "1" = Monday ... "7" = Sunday: list of [start, end] as "HH:MM". */
  hours: Record<string, [string, string][]>;
  closed_dates: string[];
  busy_calendars: string[] | null;
  requests_calendar: string | null;
  main_calendar: string | null;
  todo_calendar: string | null;
  ics_links: IcsLink[];
  auto_release_hours: number | null;
}

export interface IcsLink {
  name: string;
  url: string;
  busy: boolean;
  allday_blocks: boolean;
}

export const DEFAULT_BOOKING: BookingConfig = {
  enabled: false,
  duration_min: 60,
  buffer_min: 15,
  notice_hours: 24,
  horizon_weeks: 8,
  step_min: 30,
  hours: {},
  closed_dates: [],
  busy_calendars: null,
  requests_calendar: null,
  main_calendar: null,
  todo_calendar: null,
  ics_links: [],
  auto_release_hours: null,
};

export interface Busy {
  start: number;
  end: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The Brussels calendar date (YYYY-MM-DD) of an instant. */
export function zonedDate(t: number | Date, tz = TZ): string {
  const p = parts(new Date(t), tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "HH:MM" Brussels time of an instant. */
export function zonedClock(t: number | Date, tz = TZ): string {
  const p = parts(new Date(t), tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

function parts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(d)) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** The instant of a Brussels wall-clock time ("2026-03-29", "10:30"). */
export function zonedTime(date: string, clock: string, tz = TZ): number {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = clock.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  // Offset of the zone at that moment; one correction handles the DST edges.
  let t = guess - offset(guess, tz);
  t = guess - offset(t, tz);
  return t;
}

function offset(t: number, tz: string): number {
  const p = parts(new Date(t), tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
}

/** ISO weekday of a YYYY-MM-DD date: 1 = Monday ... 7 = Sunday. */
export function weekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

/** The next calendar date. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

const minutes = (clock: string) => {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
};

/** Is "HH:MM" a valid clock time? */
export const isClock = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** Can clients book at all (switched on and at least one opening slot)? */
export function hasHours(cfg: BookingConfig): boolean {
  return Object.values(cfg.hours ?? {}).some((ranges) => ranges.some(([a, b]) => isClock(a) && isClock(b) && minutes(b) > minutes(a)));
}

/** The first and last moment a client may book, from `now`. */
export function bookingWindow(cfg: BookingConfig, now: number): { from: number; to: number } {
  return { from: now + cfg.notice_hours * 3600_000, to: now + cfg.horizon_weeks * 7 * 86400_000 };
}

/**
 * Free start times for each date from `firstDate` to `lastDate` (inclusive),
 * as epoch ms. A slot is free when the whole appointment, with the buffer
 * before and after, overlaps nothing busy.
 */
export function freeSlots(cfg: BookingConfig, busy: Busy[], firstDate: string, lastDate: string, now: number): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  const { from, to } = bookingWindow(cfg, now);
  const closed = new Set(cfg.closed_dates ?? []);
  const len = cfg.duration_min * 60_000;
  const buf = cfg.buffer_min * 60_000;
  const step = cfg.step_min * 60_000;
  const sorted = [...busy].sort((a, b) => a.start - b.start);

  for (let date = firstDate; date <= lastDate; date = addDays(date, 1)) {
    if (closed.has(date)) continue;
    const ranges = cfg.hours?.[String(weekday(date))] ?? [];
    const slots: number[] = [];
    for (const [a, b] of ranges) {
      if (!isClock(a) || !isClock(b)) continue;
      const open = zonedTime(date, a);
      const close = zonedTime(date, b);
      for (let s = open; s + len <= close; s += step) {
        if (s < from || s > to) continue;
        const e = s + len;
        if (sorted.some((x) => x.start < e + buf && x.end > s - buf)) continue;
        slots.push(s);
      }
    }
    if (slots.length) out[date] = [...new Set(slots)].sort((x, y) => x - y);
  }
  return out;
}

/** Is this exact start time one of the free slots? */
export function isFree(cfg: BookingConfig, busy: Busy[], start: number, now: number): boolean {
  const date = zonedDate(start);
  return (freeSlots(cfg, busy, date, date, now)[date] ?? []).includes(start);
}

/** Read a booking_settings row into a full config with safe defaults. */
export function toConfig(row: Partial<Record<keyof BookingConfig, unknown>> | null | undefined): BookingConfig {
  const r = row ?? {};
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const links = Array.isArray(r.ics_links) ? (r.ics_links as Partial<IcsLink>[]) : [];
  return {
    enabled: r.enabled === true,
    duration_min: num(r.duration_min, DEFAULT_BOOKING.duration_min),
    buffer_min: num(r.buffer_min, DEFAULT_BOOKING.buffer_min),
    notice_hours: num(r.notice_hours, DEFAULT_BOOKING.notice_hours),
    horizon_weeks: num(r.horizon_weeks, DEFAULT_BOOKING.horizon_weeks),
    step_min: num(r.step_min, DEFAULT_BOOKING.step_min),
    hours: r.hours && typeof r.hours === 'object' ? (r.hours as BookingConfig['hours']) : {},
    closed_dates: Array.isArray(r.closed_dates) ? (r.closed_dates as string[]) : [],
    busy_calendars: Array.isArray(r.busy_calendars) ? (r.busy_calendars as string[]) : null,
    requests_calendar: typeof r.requests_calendar === 'string' ? r.requests_calendar : null,
    main_calendar: typeof r.main_calendar === 'string' ? r.main_calendar : null,
    todo_calendar: typeof r.todo_calendar === 'string' ? r.todo_calendar : null,
    ics_links: links
      .filter((l) => typeof l?.url === 'string' && l.url)
      .map((l) => ({ name: String(l.name ?? ''), url: String(l.url), busy: l.busy !== false, allday_blocks: l.allday_blocks === true })),
    auto_release_hours: typeof r.auto_release_hours === 'number' ? r.auto_release_hours : null,
  };
}

const LOCALE_TAG: Record<string, string> = { en: 'en-GB', nl: 'nl-BE', fr: 'fr-BE' };

/** "Tuesday 14 October, 10:30" in the reader's language, Brussels time. */
export function formatWhen(t: number, locale: string): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? 'en-GB', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(t);
}
