import 'server-only';

/**
 * A small CalDAV client for Farah's iCloud calendars, with plain fetch.
 *
 * It signs in with her Apple ID and an app-specific password
 * (ICLOUD_USERNAME, ICLOUD_APP_PASSWORD in Vercel), finds her calendars and
 * reads, writes and deletes events in them. Without those two variables
 * everything here reports "not configured" and the site falls back to the
 * plain appointment form.
 */

const ROOT = 'https://caldav.icloud.com';
const TIMEOUT_MS = 12_000;

export interface Calendar {
  href: string;
  name: string;
  color: string | null;
  /** Holds events (VEVENT). Reminder lists are left out. */
  events: boolean;
  readOnly: boolean;
}

export interface CalObject {
  href: string;
  etag: string;
  data: string;
}

export class CalDavError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

export const icloudConfigured = () => Boolean(process.env.ICLOUD_USERNAME && process.env.ICLOUD_APP_PASSWORD);

function auth(): string {
  const u = process.env.ICLOUD_USERNAME ?? '';
  const p = (process.env.ICLOUD_APP_PASSWORD ?? '').replace(/\s/g, '');
  return 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
}

async function dav(method: string, url: string, body?: string, headers: Record<string, string> = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const init: RequestInit = {
      method,
      body,
      redirect: 'manual',
      headers: { authorization: auth(), ...(body ? { 'content-type': 'application/xml; charset=utf-8' } : {}), ...headers },
      signal: ctrl.signal,
      cache: 'no-store',
    };
    let res = await fetch(url, init);
    // iCloud moves accounts to a pNN-caldav host; follow it keeping the method.
    for (let i = 0; i < 3 && res.status >= 300 && res.status < 400 && res.headers.get('location'); i++) {
      url = new URL(res.headers.get('location')!, url).toString();
      res = await fetch(url, init);
    }
    Object.defineProperty(res, 'finalUrl', { value: url });
    if (res.status === 401) throw new CalDavError('iCloud refused the Apple ID or app-specific password.', 401);
    return res;
  } catch (e) {
    if (e instanceof CalDavError) throw e;
    throw new CalDavError(ctrl.signal.aborted ? 'iCloud did not answer in time.' : 'Could not reach iCloud.');
  } finally {
    clearTimeout(timer);
  }
}

const finalUrl = (r: Response, fallback: string) => (r as Response & { finalUrl?: string }).finalUrl || fallback;

/* Minimal reading of WebDAV multistatus XML ------------------------------ */

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#13;/g, '\r')
    .replace(/&#10;/g, '\n')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');

/** The text inside the first <prefix:tag> element, if any. */
function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`, 'i'));
  return m ? m[1] : null;
}

const hasTag = (xml: string, name: string) => new RegExp(`<(?:[\\w-]+:)?${name}[\\s/>]`, 'i').test(xml);

function responses(xml: string): string[] {
  return xml.split(/<(?:[\w-]+:)?response[\s>]/i).slice(1);
}

/** Only the parts of a response whose propstat status is 200. */
function okProps(resp: string): string {
  return resp
    .split(/<(?:[\w-]+:)?propstat[\s>]/i)
    .slice(1)
    .filter((p) => /HTTP\/1\.[01] 200/.test(tag(p, 'status') ?? ''))
    .join('\n');
}

const hrefOf = (resp: string) => decode((tag(resp, 'href') ?? '').trim());

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Discovery -------------------------------------------------------------- */

let homeCache: { home: string; at: number } | null = null;

/** The URL that holds all her calendars, found once and kept for an hour. */
async function calendarHome(): Promise<string> {
  if (homeCache && Date.now() - homeCache.at < 3600_000) return homeCache.home;
  const r1 = await dav('PROPFIND', `${ROOT}/`, `<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`, { depth: '0' });
  const x1 = await r1.text();
  const principal = tag(tag(x1, 'current-user-principal') ?? '', 'href');
  if (!principal) throw new CalDavError(`iCloud did not say where the calendars are (${r1.status}).`, r1.status);
  const pUrl = new URL(decode(principal.trim()), finalUrl(r1, `${ROOT}/`)).toString();
  const r2 = await dav(
    'PROPFIND',
    pUrl,
    `<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`,
    { depth: '0' },
  );
  const x2 = await r2.text();
  const home = tag(tag(x2, 'calendar-home-set') ?? '', 'href');
  if (!home) throw new CalDavError('iCloud did not give the calendar address.', r2.status);
  const url = new URL(decode(home.trim()), finalUrl(r2, pUrl)).toString();
  homeCache = { home: url.endsWith('/') ? url : url + '/', at: Date.now() };
  return homeCache.home;
}

/** All her calendars (event calendars only). */
export async function listCalendars(): Promise<Calendar[]> {
  const home = await calendarHome();
  const res = await dav(
    'PROPFIND',
    home,
    `<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:a="http://apple.com/ns/ical/"><d:prop><d:displayname/><d:resourcetype/><c:supported-calendar-component-set/><a:calendar-color/><d:current-user-privilege-set/></d:prop></d:propfind>`,
    { depth: '1' },
  );
  if (res.status !== 207) throw new CalDavError(`iCloud calendar list failed (${res.status}).`, res.status);
  const xml = await res.text();
  const out: Calendar[] = [];
  for (const r of responses(xml)) {
    const props = okProps(r);
    if (!hasTag(tag(props, 'resourcetype') ?? '', 'calendar')) continue;
    const comps = tag(props, 'supported-calendar-component-set') ?? '';
    const events = !comps || /name="VEVENT"/i.test(comps);
    if (!events) continue;
    const priv = tag(props, 'current-user-privilege-set') ?? '';
    const href = new URL(hrefOf(r), home).toString();
    out.push({
      href,
      name: decode((tag(props, 'displayname') ?? '').trim()) || 'Calendar',
      color: (tag(props, 'calendar-color') ?? '').trim().slice(0, 7) || null,
      events,
      readOnly: Boolean(priv) && !hasTag(priv, 'write') && !hasTag(priv, 'all') && !hasTag(priv, 'write-content'),
    });
  }
  return out;
}

/** Find a calendar by name, or create it. Returns its address. */
export async function ensureCalendar(name: string, color = '#B08D57'): Promise<string> {
  const existing = (await listCalendars()).find((c) => c.name === name);
  if (existing) return existing.href;
  const home = await calendarHome();
  const href = `${home}${crypto.randomUUID().toUpperCase()}/`;
  const res = await dav(
    'MKCALENDAR',
    href,
    `<?xml version="1.0" encoding="utf-8"?><c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:a="http://apple.com/ns/ical/"><d:set><d:prop><d:displayname>${xmlEsc(name)}</d:displayname><a:calendar-color>${color}FF</a:calendar-color><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set></d:prop></d:set></c:mkcalendar>`,
  );
  if (res.status !== 201) throw new CalDavError(`Could not create the calendar "${name}" (${res.status}).`, res.status);
  return href;
}

/** Events of one calendar that touch [from, to). Repeating events come whole; ics.ts expands them. */
export async function fetchObjects(calendarHref: string, from: number, to: number): Promise<CalObject[]> {
  const stamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const res = await dav(
    'REPORT',
    calendarHref,
    `<?xml version="1.0" encoding="utf-8"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="${stamp(from)}" end="${stamp(to)}"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`,
    { depth: '1' },
  );
  if (res.status !== 207) throw new CalDavError(`Reading the calendar failed (${res.status}).`, res.status);
  const xml = await res.text();
  return responses(xml)
    .map((r) => {
      const props = okProps(r);
      const data = tag(props, 'calendar-data');
      return data ? { href: new URL(hrefOf(r), calendarHref).toString(), etag: decode((tag(props, 'getetag') ?? '').trim()), data: decode(data) } : null;
    })
    .filter((o): o is CalObject => o !== null);
}

/** One event resource, fresh, with its etag. */
export async function getObject(href: string): Promise<CalObject | null> {
  const res = await dav('GET', href);
  if (res.status === 404) return null;
  if (!res.ok) throw new CalDavError(`Reading the event failed (${res.status}).`, res.status);
  return { href, etag: res.headers.get('etag') ?? '', data: await res.text() };
}

/**
 * Write an event. `etag` = the version it was read at: iCloud refuses the
 * write (412) if it changed on the iPhone since, so nothing typed there is
 * overwritten. A new event (no etag) must not exist yet.
 */
export async function putObject(href: string, ics: string, etag?: string | null): Promise<string> {
  const res = await dav('PUT', href, ics, {
    'content-type': 'text/calendar; charset=utf-8',
    ...(etag ? { 'if-match': etag } : { 'if-none-match': '*' }),
  });
  if (res.status === 412) throw new CalDavError('This event was changed on the iPhone in the meantime. Reload and try again.', 412);
  if (!res.ok) throw new CalDavError(`Saving the event failed (${res.status}).`, res.status);
  return res.headers.get('etag') ?? '';
}

export async function deleteObject(href: string, etag?: string | null): Promise<void> {
  const res = await dav('DELETE', href, undefined, etag ? { 'if-match': etag } : {});
  if (res.status === 412) throw new CalDavError('This event was changed on the iPhone in the meantime. Reload and try again.', 412);
  if (!res.ok && res.status !== 404) throw new CalDavError(`Deleting the event failed (${res.status}).`, res.status);
}

/** A new event address inside a calendar. */
export const newHref = (calendarHref: string, uid: string) => `${calendarHref.endsWith('/') ? calendarHref : calendarHref + '/'}${uid}.ics`;

/** Is this address one of her iCloud calendars (not some other server)? */
export function isIcloudHref(href: unknown): href is string {
  if (typeof href !== 'string') return false;
  try {
    const u = new URL(href);
    return u.protocol === 'https:' && /(^|\.)icloud\.com$/.test(u.hostname);
  } catch {
    return false;
  }
}
