import 'server-only';
import { bookingLive, busyTimes, clearAgendaCache, getBookingConfig, getCalendars, saveCalendarRef } from './agenda';
import { addDays, isFree, zonedDate, type BookingConfig } from './booking';
import { deleteObject, ensureCalendar, icloudConfigured, newHref, putObject } from './caldav';
import { SITE_URL } from './config';
import { getSettings, getTexts } from './data';
import { adminAddress, sendEmail } from './email';
import { adminBookingCancelled, adminNewBooking, bookingConfirmed, bookingDeclined, bookingReceived } from './emails';
import { isLocale, type Locale } from './i18n';
import { buildEvent, type EventInput } from './ics';
import { href } from './routes';
import { getServiceDb } from './supabase';
import { makeT } from './t';
import { zonedClock } from './booking';

/**
 * A booking's life: requested (held in Farah's "58 Diamonds requests"
 * calendar), then approved (moved to her main calendar, client gets the
 * confirmation and an .ics) or declined (hold removed, client told), or
 * cancelled by the client from the link in their email.
 */

export const REQUESTS_CALENDAR = '58 Diamonds requests';
export const TODO_CALENDAR = '58 Diamonds to do';

export interface BookingRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  locale: string;
  starts_at: string;
  ends_at: string;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  caldav_href: string | null;
  caldav_uid: string | null;
  decision_token: string;
  client_token: string;
}

const COLUMNS = 'id,name,email,phone,message,locale,starts_at,ends_at,status,caldav_href,caldav_uid,decision_token,client_token';

export async function getBooking(id: string): Promise<BookingRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await getServiceDb().from('appointment_requests').select(COLUMNS).eq('id', id).maybeSingle();
  return (data as BookingRow | null) ?? null;
}

const loc = (l: string): Locale => (isLocale(l) ? l : 'en');

async function tFor(locale: string) {
  return makeT(await getTexts(), loc(locale));
}

/** Farah's place, for the client's confirmation. */
async function place(): Promise<string> {
  const s = await getSettings();
  return (s.address || s.company_address || '').replace(/\n+/g, ', ');
}

export const decideLink = (b: Pick<BookingRow, 'id' | 'decision_token'>) => `${SITE_URL}/en/booking/decide?id=${b.id}&token=${b.decision_token}`;
export const cancelLink = (b: Pick<BookingRow, 'id' | 'client_token' | 'locale'>) => `${SITE_URL}/${loc(b.locale)}/contact/cancel?id=${b.id}&token=${b.client_token}`;

function eventFor(b: BookingRow, pending: boolean): EventInput {
  const s = Date.parse(b.starts_at);
  const e = Date.parse(b.ends_at);
  return {
    title: pending ? `Request: ${b.name}` : `58 Diamonds: ${b.name}`,
    allDay: false,
    startDate: zonedDate(s),
    startTime: zonedClock(s),
    endDate: zonedDate(e),
    endTime: zonedClock(e),
    location: '',
    notes: [b.phone, b.email, b.message, `${SITE_URL}/admin/requests`].filter(Boolean).join('\n'),
    repeat: 'none',
    alarmMin: pending ? null : 60,
  };
}

/** The calendar confirmed appointments go to: the one chosen in admin, else her first own calendar. */
async function mainCalendar(cfg: BookingConfig): Promise<string> {
  const cals = await getCalendars(true);
  if (cfg.main_calendar && cals.some((c) => c.href === cfg.main_calendar)) return cfg.main_calendar;
  const own = cals.filter((c) => !c.readOnly && c.href !== cfg.requests_calendar && c.href !== cfg.todo_calendar && c.name !== REQUESTS_CALENDAR && c.name !== TODO_CALENDAR);
  const pick = own.find((c) => /^(calendar|agenda|calendrier|kalender|home|thuis|domicile|work|werk)$/i.test(c.name)) ?? own[0];
  if (!pick) throw new Error('No calendar to write to.');
  await saveCalendarRef('main_calendar', pick.href);
  return pick.href;
}

async function requestsCalendar(cfg: BookingConfig): Promise<string> {
  if (cfg.requests_calendar) return cfg.requests_calendar;
  const h = await ensureCalendar(REQUESTS_CALENDAR, '#B08D57');
  await saveCalendarRef('requests_calendar', h);
  return h;
}

/** Remove a booking's event from iCloud. Best effort: a hold that is already gone is fine. */
async function removeEvent(b: BookingRow) {
  if (!b.caldav_href || !icloudConfigured()) return;
  await deleteObject(b.caldav_href).catch((e) => console.error('Could not remove the calendar event:', e));
}

async function writeEvent(b: BookingRow, calendar: string, pending: boolean): Promise<{ href: string; uid: string } | null> {
  if (!icloudConfigured()) return null;
  const uid = `58d-${b.id}-${pending ? 'request' : 'confirmed'}`;
  const h = newHref(calendar, uid);
  try {
    await deleteObject(h).catch(() => undefined);
    await putObject(h, buildEvent(uid, eventFor(b, pending)));
    return { href: h, uid };
  } catch (e) {
    console.error('Could not write the calendar event:', e);
    return null;
  }
}

export type BookResult = { ok: true } | { error: 'off' | 'taken' | 'invalid' | 'failed' };

/** A client picked a time on the site. */
export async function createBooking(input: { name: string; email: string | null; phone: string | null; message: string; locale: string; start: number }): Promise<BookResult> {
  const cfg = await getBookingConfig();
  if (!bookingLive(cfg)) return { error: 'off' };
  const now = Date.now();
  const day = zonedDate(input.start);
  const { busy } = await busyTimes(cfg, Date.parse(`${addDays(day, -1)}T00:00:00Z`), Date.parse(`${addDays(day, 2)}T00:00:00Z`), true);
  if (!isFree(cfg, busy, input.start, now)) return { error: 'taken' };

  const db = getServiceDb();
  const end = input.start + cfg.duration_min * 60_000;
  const { data, error } = await db
    .from('appointment_requests')
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      locale: loc(input.locale),
      starts_at: new Date(input.start).toISOString(),
      ends_at: new Date(end).toISOString(),
      status: 'pending',
      preferred_date: null,
    })
    .select(COLUMNS)
    .single();
  if (error || !data) return { error: 'failed' };
  const b = data as BookingRow;
  clearAgendaCache();

  // Hold the time on her iPhone straight away.
  const cal = await requestsCalendar(cfg).catch((e) => (console.error(e), null));
  const ev = cal ? await writeEvent(b, cal, true) : null;
  if (ev) await db.from('appointment_requests').update({ caldav_href: ev.href, caldav_uid: ev.uid }).eq('id', b.id);

  const settings = await getSettings();
  const to = adminAddress(settings.email);
  if (to) await sendEmail({ to, ...adminNewBooking(b, decideLink(b)), replyTo: b.email });
  if (b.email) await sendEmail({ to: b.email, ...bookingReceived(b, await tFor(b.locale), loc(b.locale)) });
  return { ok: true };
}

/** Farah's answer, from the email link or the admin. */
export async function decideBooking(b: BookingRow, action: 'approve' | 'decline', note: string | null): Promise<{ ok: true } | { error: string }> {
  if (b.status !== 'pending') return { error: b.status === 'confirmed' ? 'Already approved.' : `This request is ${b.status}.` };
  const db = getServiceDb();
  const cfg = await getBookingConfig();
  const t = await tFor(b.locale);
  const locale = loc(b.locale);

  if (action === 'approve') {
    await removeEvent(b);
    const cal = await mainCalendar(cfg).catch((e) => (console.error(e), null));
    const ev = cal ? await writeEvent(b, cal, false) : null;
    await db
      .from('appointment_requests')
      .update({ status: 'confirmed', handled: true, decided_at: new Date().toISOString(), decision_note: note, caldav_href: ev?.href ?? null, caldav_uid: ev?.uid ?? null })
      .eq('id', b.id);
    clearAgendaCache();
    if (b.email) {
      const ics = buildEvent(`58d-${b.id}-client`, { ...eventFor(b, false), title: '58 Diamonds', notes: '', location: await place() });
      await sendEmail({
        to: b.email,
        ...bookingConfirmed(b, t, locale, await place(), cancelLink(b)),
        attachments: [{ filename: '58-diamonds.ics', content: new TextEncoder().encode(ics) }],
      });
    }
    return { ok: true };
  }

  await removeEvent(b);
  await db
    .from('appointment_requests')
    .update({ status: 'declined', handled: true, decided_at: new Date().toISOString(), decision_note: note, caldav_href: null })
    .eq('id', b.id);
  clearAgendaCache();
  if (b.email) await sendEmail({ to: b.email, ...bookingDeclined(b, t, locale, note, `${SITE_URL}${href.contact(locale)}`) });
  return { ok: true };
}

/** The client cancels from the link in their email. */
export async function cancelBooking(b: BookingRow): Promise<boolean> {
  if (b.status !== 'pending' && b.status !== 'confirmed') return false;
  if (Date.parse(b.starts_at) < Date.now()) return false;
  await removeEvent(b);
  await getServiceDb().from('appointment_requests').update({ status: 'cancelled', handled: true, caldav_href: null }).eq('id', b.id);
  clearAgendaCache();
  const settings = await getSettings();
  const to = adminAddress(settings.email);
  if (to) await sendEmail({ to, ...adminBookingCancelled(b) });
  return true;
}

/** Farah moves a booking to another time in the admin. */
export async function moveBooking(b: BookingRow, start: number): Promise<{ ok: true } | { error: string }> {
  if (b.status !== 'pending' && b.status !== 'confirmed') return { error: `This request is ${b.status}.` };
  const len = Date.parse(b.ends_at) - Date.parse(b.starts_at);
  const moved: BookingRow = { ...b, starts_at: new Date(start).toISOString(), ends_at: new Date(start + len).toISOString() };
  const cfg = await getBookingConfig();
  await removeEvent(b);
  const cal = b.status === 'pending' ? await requestsCalendar(cfg).catch(() => null) : await mainCalendar(cfg).catch(() => null);
  const ev = cal ? await writeEvent(moved, cal, b.status === 'pending') : null;
  await getServiceDb()
    .from('appointment_requests')
    .update({ starts_at: moved.starts_at, ends_at: moved.ends_at, caldav_href: ev?.href ?? null, caldav_uid: ev?.uid ?? null, client_reminded_at: null })
    .eq('id', b.id);
  clearAgendaCache();
  if (b.status === 'confirmed' && b.email) {
    const t = await tFor(b.locale);
    const ics = buildEvent(`58d-${b.id}-client`, { ...eventFor(moved, false), title: '58 Diamonds', notes: '', location: await place() });
    await sendEmail({
      to: b.email,
      ...bookingConfirmed(moved, t, loc(b.locale), await place(), cancelLink(b)),
      attachments: [{ filename: '58-diamonds.ics', content: new TextEncoder().encode(ics) }],
    });
  }
  return { ok: true };
}

export { place as bookingPlace, tFor as bookingT, loc as bookingLocale };
