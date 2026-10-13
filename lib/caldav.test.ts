import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { fetchObjects, listCalendars, putObject } from './caldav';

/** iCloud-shaped answers, so the XML reading is checked without a network. */
const principal = `<?xml version="1.0"?><multistatus xmlns="DAV:"><response><href>/</href><propstat><prop><current-user-principal><href>/123456/principal/</href></current-user-principal></prop><status>HTTP/1.1 200 OK</status></propstat></response></multistatus>`;
const home = `<?xml version="1.0"?><multistatus xmlns="DAV:"><response><href>/123456/principal/</href><propstat><prop><calendar-home-set xmlns="urn:ietf:params:xml:ns:caldav"><href xmlns="DAV:">https://p42-caldav.icloud.com:443/123456/calendars/</href></calendar-home-set></prop><status>HTTP/1.1 200 OK</status></propstat></response></multistatus>`;
const calendars = `<?xml version="1.0" encoding="UTF-8"?>
<multistatus xmlns="DAV:">
<response><href>/123456/calendars/</href><propstat><prop><resourcetype><collection/></resourcetype></prop><status>HTTP/1.1 200 OK</status></propstat></response>
<response><href>/123456/calendars/home/</href><propstat><prop><displayname>Home</displayname><resourcetype><collection/><calendar xmlns="urn:ietf:params:xml:ns:caldav"/></resourcetype><supported-calendar-component-set xmlns="urn:ietf:params:xml:ns:caldav"><comp name="VEVENT"/></supported-calendar-component-set><calendar-color xmlns="http://apple.com/ns/ical/">#1BADF8FF</calendar-color><current-user-privilege-set><privilege><all/></privilege></current-user-privilege-set></prop><status>HTTP/1.1 200 OK</status></propstat></response>
<response><href>/123456/calendars/tasks/</href><propstat><prop><displayname>Reminders</displayname><resourcetype><collection/><calendar xmlns="urn:ietf:params:xml:ns:caldav"/></resourcetype><supported-calendar-component-set xmlns="urn:ietf:params:xml:ns:caldav"><comp name="VTODO"/></supported-calendar-component-set></prop><status>HTTP/1.1 200 OK</status></propstat></response>
</multistatus>`;
const report = `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:response><d:href>/123456/calendars/home/abc.ics</d:href><d:propstat><d:prop><d:getetag>"C=1@U=2"</d:getetag><c:calendar-data>BEGIN:VCALENDAR&#13;
BEGIN:VEVENT&#13;
UID:abc&#13;
SUMMARY:Dentist &amp; school&#13;
END:VEVENT&#13;
END:VCALENDAR&#13;
</c:calendar-data></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>`;

const answers: [RegExp, number, string, Record<string, string>?][] = [];
const calls: { method: string; url: string; headers: Record<string, string> }[] = [];

beforeEach(() => {
  process.env.ICLOUD_USERNAME = 'farah@example.com';
  process.env.ICLOUD_APP_PASSWORD = 'abcd-efgh-ijkl-mnop';
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ method: String(init.method), url, headers: init.headers as Record<string, string> });
    const hit = answers.find(([re]) => re.test(`${init.method} ${url}`));
    if (!hit) return new Response('', { status: 404 });
    return new Response(hit[2], { status: hit[1], headers: hit[3] });
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('iCloud CalDAV', () => {
  it('finds the event calendars, not reminder lists', async () => {
    answers.push(
      [/^PROPFIND https:\/\/caldav\.icloud\.com\/$/, 207, principal],
      [/^PROPFIND https:\/\/caldav\.icloud\.com\/123456\/principal\/$/, 207, home],
      [/^PROPFIND https:\/\/p42-caldav\.icloud\.com(:443)?\/123456\/calendars\/$/, 207, calendars],
    );
    const cals = await listCalendars();
    expect(cals).toEqual([{ href: 'https://p42-caldav.icloud.com/123456/calendars/home/', name: 'Home', color: '#1BADF8', events: true, readOnly: false }]);
    expect(calls[0].headers.authorization).toBe('Basic ' + Buffer.from('farah@example.com:abcd-efgh-ijkl-mnop').toString('base64'));
  });
  it('reads events with their etag and decodes the XML', async () => {
    answers.push([/^REPORT /, 207, report]);
    const [o] = await fetchObjects('https://p42-caldav.icloud.com/123456/calendars/home/', 0, Date.now());
    expect(o.href).toBe('https://p42-caldav.icloud.com/123456/calendars/home/abc.ics');
    expect(o.etag).toBe('"C=1@U=2"');
    expect(o.data).toContain('SUMMARY:Dentist & school\r\n');
  });
  it('refuses to overwrite a change made on the iPhone', async () => {
    answers.push([/^PUT /, 412, '']);
    await expect(putObject('https://p42-caldav.icloud.com/x.ics', 'BEGIN:VCALENDAR', '"old"')).rejects.toThrow(/changed on the iPhone/);
    expect(calls.at(-1)!.headers['if-match']).toBe('"old"');
  });
});
