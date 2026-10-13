import 'server-only';
import { DEFAULT_BOOKING, hasHours, toConfig, type Busy, type BookingConfig, type IcsLink } from './booking';
import { fetchObjects, icloudConfigured, listCalendars, type Calendar } from './caldav';
import { isTransparent, occurrences, type Occurrence } from './ics';
import { HAS_DATABASE } from './config';
import { getServiceDb } from './supabase';

/**
 * Farah's whole agenda, from three places: her iCloud calendars, read-only
 * calendar links (Smartschool and the like) and the bookings in the database.
 * Reads are kept for five minutes so the booking page stays quick; anything
 * that decides a booking reads fresh.
 */

const CACHE_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, fresh: boolean, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  return value;
}

/** Forget cached calendar reads (after Farah edits something). */
export function clearAgendaCache() {
  cache.clear();
}

export async function getBookingConfig(): Promise<BookingConfig> {
  if (!HAS_DATABASE || !process.env.SUPABASE_SERVICE_ROLE_KEY) return DEFAULT_BOOKING;
  const { data } = await getServiceDb().from('booking_settings').select('*').eq('id', 1).maybeSingle();
  return toConfig(data);
}

export async function saveCalendarRef(field: 'requests_calendar' | 'main_calendar' | 'todo_calendar', href: string) {
  await getServiceDb().from('booking_settings').update({ [field]: href, updated_at: new Date().toISOString() }).eq('id', 1);
}

/** What still stops clients from booking online; empty when it is live. */
export function bookingMissing(cfg: BookingConfig): string[] {
  const missing: string[] = [];
  if (!icloudConfigured()) missing.push('icloud');
  if (!process.env.RESEND_API_KEY) missing.push('email');
  if (!hasHours(cfg)) missing.push('hours');
  if (!cfg.enabled) missing.push('switch');
  return missing;
}

export const bookingLive = (cfg: BookingConfig) => bookingMissing(cfg).length === 0;

/* Sources ---------------------------------------------------------------- */

export interface AgendaItem extends Occurrence {
  source: 'icloud' | 'link' | 'booking';
  /** iCloud: the calendar and the event resource. */
  calendar?: string;
  href?: string;
  etag?: string;
  /** Read-only items cannot be edited here (links, read-only calendars). */
  readOnly: boolean;
  color?: string | null;
  calendarName?: string;
  /** Booking rows. */
  bookingId?: string;
  status?: string;
  transparent?: boolean;
}

export async function getCalendars(fresh = false): Promise<Calendar[]> {
  if (!icloudConfigured()) return [];
  return cached('calendars', fresh, listCalendars);
}

/** Events of the given iCloud calendars in [from, to). */
export async function icloudItems(calendars: Calendar[], from: number, to: number, fresh = false): Promise<AgendaItem[]> {
  const lists = await Promise.all(
    calendars.map((cal) =>
      cached(`cal:${cal.href}:${from}:${to}`, fresh, async () => {
        const objects = await fetchObjects(cal.href, from, to);
        return objects.flatMap((o) =>
          occurrences(o.data, from, to).map(
            (occ): AgendaItem => ({
              ...occ,
              source: 'icloud',
              calendar: cal.href,
              calendarName: cal.name,
              color: cal.color,
              href: o.href,
              etag: o.etag,
              readOnly: cal.readOnly,
              transparent: isTransparent(occ),
            }),
          ),
        );
      }),
    ),
  );
  return lists.flat();
}

const MAX_ICS_BYTES = 5_000_000;

/** Events from a calendar link (Smartschool planner export and the like). */
export async function linkItems(link: IcsLink, from: number, to: number, fresh = false): Promise<AgendaItem[]> {
  const text = await cached(`ics:${link.url}`, fresh, async () => {
    const url = link.url.replace(/^webcals?:\/\//i, 'https://');
    if (!/^https?:\/\//i.test(url)) return '';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store', headers: { accept: 'text/calendar, */*' } });
      if (!res.ok) return '';
      const body = await res.text();
      return body.length > MAX_ICS_BYTES ? '' : body;
    } catch {
      return '';
    } finally {
      clearTimeout(timer);
    }
  });
  return occurrences(text, from, to).map((o) => ({ ...o, source: 'link', readOnly: true, calendarName: link.name || 'Link', color: '#9a9187', transparent: isTransparent(o) }));
}

/** Pending and confirmed bookings in [from, to). */
export async function bookingItems(from: number, to: number): Promise<AgendaItem[]> {
  if (!HAS_DATABASE || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const { data } = await getServiceDb()
    .from('appointment_requests')
    .select('id,name,phone,email,message,starts_at,ends_at,status')
    .in('status', ['pending', 'confirmed'])
    .lt('starts_at', new Date(to).toISOString())
    .gt('ends_at', new Date(from).toISOString());
  return (data ?? []).map((r) => {
    const start = Date.parse(r.starts_at);
    const end = Date.parse(r.ends_at);
    return {
      uid: `booking-${r.id}`,
      recurrenceId: null,
      recurring: false,
      start,
      end,
      allDay: false,
      startDate: '',
      endDate: '',
      title: r.name,
      location: '',
      notes: [r.phone, r.email, r.message].filter(Boolean).join('\n'),
      source: 'booking' as const,
      readOnly: true,
      bookingId: r.id,
      status: r.status,
      color: '#8a6a3b',
    };
  });
}

/**
 * Busy times for the booking page. `unverified` is true when iCloud could not
 * be read: the page then still offers the opening hours, and Farah confirms.
 */
export async function busyTimes(cfg: BookingConfig, from: number, to: number, fresh = false): Promise<{ busy: Busy[]; unverified: boolean }> {
  const busy: Busy[] = [];
  let unverified = false;

  const add = (items: AgendaItem[], allDayBlocks: boolean) => {
    for (const i of items) {
      if (i.transparent) continue;
      if (i.allDay && !allDayBlocks) continue;
      busy.push({ start: i.start, end: i.end });
    }
  };

  const tasks: Promise<void>[] = [];
  if (icloudConfigured()) {
    tasks.push(
      (async () => {
        try {
          const all = await getCalendars(fresh);
          const skip = new Set([cfg.todo_calendar].filter(Boolean));
          const chosen = all.filter((c) => !skip.has(c.href) && (cfg.busy_calendars === null || cfg.busy_calendars.includes(c.href) || c.href === cfg.requests_calendar || c.href === cfg.main_calendar));
          add(await icloudItems(chosen, from, to, fresh), false);
        } catch (e) {
          console.error('iCloud read failed:', e);
          unverified = true;
        }
      })(),
    );
  } else {
    unverified = true;
  }
  for (const link of cfg.ics_links.filter((l) => l.busy)) {
    tasks.push(linkItems(link, from, to, fresh).then((items) => add(items, link.allday_blocks)));
  }
  tasks.push(bookingItems(from, to).then((items) => add(items, true)));
  await Promise.all(tasks);
  return { busy, unverified };
}
