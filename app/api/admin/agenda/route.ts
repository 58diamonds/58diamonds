import { NextResponse } from 'next/server';
import { bookingItems, bookingMissing, clearAgendaCache, getBookingConfig, getCalendars, icloudItems, linkItems } from '@/lib/agenda';
import { CalDavError, deleteObject, getObject, icloudConfigured, isIcloudHref, newHref, putObject } from '@/lib/caldav';
import { buildEvent, editEvent, isDate, readEvent, skipOccurrence, type EventInput } from '@/lib/ics';
import { isClock } from '@/lib/booking';
import { requireManager } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * Farah's agenda for the admin: read every calendar, and add, edit or delete
 * events in her iCloud calendars. Calendar links (school) are read-only.
 */
export async function POST(req: Request) {
  if (!(await requireManager(req))) return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    switch (b.action) {
      case 'status': {
        const cfg = await getBookingConfig();
        let calendars: Awaited<ReturnType<typeof getCalendars>> = [];
        let error: string | null = null;
        if (icloudConfigured()) calendars = await getCalendars(true).catch((e) => ((error = e instanceof Error ? e.message : String(e)), []));
        return NextResponse.json({ icloud: icloudConfigured(), error, calendars, missing: bookingMissing(cfg) });
      }
      case 'list': {
        const from = Number(b.from);
        const to = Number(b.to);
        if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > 62 * 86400_000) return bad();
        const cfg = await getBookingConfig();
        const fresh = b.fresh === true;
        if (fresh) clearAgendaCache();
        const errors: string[] = [];
        const calendars = icloudConfigured() ? await getCalendars(fresh).catch((e) => (errors.push(msg(e)), [])) : [];
        const [cloud, links, bookings] = await Promise.all([
          icloudItems(calendars, from, to, fresh).catch((e) => (errors.push(msg(e)), [])),
          Promise.all(cfg.ics_links.map((l) => linkItems(l, from, to, fresh))).then((x) => x.flat()),
          bookingItems(from, to),
        ]);
        // A booking already shows as its own (gold) item; hide its copy from iCloud.
        const own = new Set(bookings.map((x) => x.bookingId));
        const items = [...cloud.filter((i) => !/^58d-([0-9a-f-]{36})-/.test(i.uid) || !own.has(i.uid.slice(4, 40))), ...links, ...bookings];
        return NextResponse.json({ items, calendars, links: cfg.ics_links.map((l) => l.name), errors });
      }
      case 'get': {
        if (!isIcloudHref(b.href)) return bad();
        const o = await getObject(b.href);
        if (!o) return NextResponse.json({ error: 'This event no longer exists.' }, { status: 404 });
        const ev = readEvent(o.data, typeof b.recurrenceId === 'string' ? b.recurrenceId : null);
        return NextResponse.json({ event: ev, etag: o.etag });
      }
      case 'save': {
        const ev = parseEvent(b.event);
        if (!ev) return bad();
        const scope = b.scope === 'one' ? 'one' : 'all';
        const rid = typeof b.recurrenceId === 'string' ? b.recurrenceId : null;
        if (typeof b.href === 'string') {
          if (!isIcloudHref(b.href)) return bad();
          const cur = await getObject(b.href);
          if (!cur) return NextResponse.json({ error: 'This event was deleted on the iPhone.' }, { status: 409 });
          if (typeof b.etag === 'string' && b.etag && cur.etag && b.etag !== cur.etag) {
            return NextResponse.json({ error: 'This event was changed on the iPhone in the meantime. Reload and try again.' }, { status: 409 });
          }
          await putObject(b.href, editEvent(cur.data, ev, scope, rid), cur.etag);
        } else {
          if (!isIcloudHref(b.calendar)) return bad();
          const uid = `58d-${crypto.randomUUID()}`;
          await putObject(newHref(b.calendar, uid), buildEvent(uid, ev));
        }
        clearAgendaCache();
        return NextResponse.json({ ok: true });
      }
      case 'delete': {
        if (!isIcloudHref(b.href)) return bad();
        const etag = typeof b.etag === 'string' ? b.etag : null;
        if (b.scope === 'one' && typeof b.recurrenceId === 'string') {
          const cur = await getObject(b.href);
          if (!cur) return NextResponse.json({ ok: true });
          if (etag && cur.etag && etag !== cur.etag) return NextResponse.json({ error: 'This event was changed on the iPhone in the meantime. Reload and try again.' }, { status: 409 });
          await putObject(b.href, skipOccurrence(cur.data, b.recurrenceId), cur.etag);
        } else {
          await deleteObject(b.href, etag);
        }
        clearAgendaCache();
        return NextResponse.json({ ok: true });
      }
      default:
        return bad();
    }
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: e instanceof CalDavError && e.status === 412 ? 409 : 500 });
  }
}

const bad = () => NextResponse.json({ error: 'invalid' }, { status: 400 });
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function parseEvent(v: unknown): EventInput | null {
  if (!v || typeof v !== 'object') return null;
  const e = v as Record<string, unknown>;
  const s = (k: string, max = 500) => (typeof e[k] === 'string' ? (e[k] as string).slice(0, max) : '');
  const allDay = e.allDay === true;
  const out: EventInput = {
    title: s('title', 300).trim(),
    allDay,
    startDate: s('startDate'),
    startTime: s('startTime'),
    endDate: s('endDate') || s('startDate'),
    endTime: s('endTime'),
    location: s('location', 500),
    notes: s('notes', 5000),
    repeat: (['none', 'daily', 'weekly', 'monthly', 'yearly'] as const).find((r) => r === e.repeat) ?? 'none',
    alarmMin: typeof e.alarmMin === 'number' && e.alarmMin >= 0 && e.alarmMin <= 40320 ? e.alarmMin : null,
  };
  if (!isDate(out.startDate) || !isDate(out.endDate)) return null;
  if (!allDay && (!isClock(out.startTime) || !isClock(out.endTime))) return null;
  return out;
}
