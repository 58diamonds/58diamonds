import { describe, expect, it } from 'vitest';
import { buildEvent, editEvent, occurrences, readEvent, skipOccurrence, type EventInput } from './ics';
import { zonedClock } from './booking';

const VTZ = `BEGIN:VTIMEZONE
TZID:Europe/Brussels
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19810329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19961027T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE`;

const weekly = `BEGIN:VCALENDAR
VERSION:2.0
${VTZ}
BEGIN:VEVENT
UID:school-run
DTSTART;TZID=Europe/Brussels:20261005T083000
DTEND;TZID=Europe/Brussels:20261005T090000
RRULE:FREQ=WEEKLY;COUNT=10
EXDATE;TZID=Europe/Brussels:20261012T083000
SUMMARY:School run
END:VEVENT
BEGIN:VEVENT
UID:school-run
RECURRENCE-ID;TZID=Europe/Brussels:20261019T083000
DTSTART;TZID=Europe/Brussels:20261019T100000
DTEND;TZID=Europe/Brussels:20261019T103000
SUMMARY:School run (late)
END:VEVENT
END:VCALENDAR`;

const R = (a: string, b: string) => [Date.parse(a), Date.parse(b)] as const;

describe('reading .ics', () => {
  it('expands repeats with exceptions and moved occurrences, in Brussels time', () => {
    const [from, to] = R('2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z');
    const occ = occurrences(weekly, from, to);
    expect(occ.map((o) => `${o.startDate} ${zonedClock(o.start)} ${o.title}`)).toEqual([
      '2026-10-05 08:30 School run',
      '2026-10-19 10:00 School run (late)',
      '2026-10-26 08:30 School run',
    ]);
  });
  it('reads all-day events and a time zone the file does not define', () => {
    const text = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:a\nDTSTART;VALUE=DATE:20261102\nDTEND;VALUE=DATE:20261104\nSUMMARY:Holiday\nEND:VEVENT\nBEGIN:VEVENT\nUID:b\nDTSTART;TZID=Europe/Brussels:20261103T140000\nDTEND;TZID=Europe/Brussels:20261103T150000\nSUMMARY:Parents evening\nEND:VEVENT\nEND:VCALENDAR`;
    const [from, to] = R('2026-11-01T00:00:00Z', '2026-11-10T00:00:00Z');
    const occ = occurrences(text, from, to);
    const h = occ.find((o) => o.uid === 'a')!;
    expect([h.allDay, h.startDate, h.endDate]).toEqual([true, '2026-11-02', '2026-11-03']);
    expect(new Date(occ.find((o) => o.uid === 'b')!.start).toISOString()).toBe('2026-11-03T13:00:00.000Z');
  });
  it('ignores garbage', () => {
    expect(occurrences('not a calendar', 0, Date.now())).toEqual([]);
  });
});

const input: EventInput = { title: 'Lunch, with Anna', allDay: false, startDate: '2026-10-20', startTime: '12:30', endDate: '2026-10-20', endTime: '13:30', location: '', notes: 'Line 1\nLine 2', repeat: 'none', alarmMin: 15 };

describe('writing .ics', () => {
  it('round-trips an event', () => {
    const text = buildEvent('u1', input, Date.parse('2026-10-01T00:00:00Z'));
    expect(readEvent(text, null)).toMatchObject({ uid: 'u1', title: 'Lunch, with Anna', startTime: '12:30', endTime: '13:30', notes: 'Line 1\nLine 2', alarmMin: 15, repeat: 'none' });
  });
  it('edits one occurrence of a repeat, or skips it', () => {
    const [from, to] = R('2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z');
    const one = occurrences(weekly, from, to)[0];
    const edited = editEvent(weekly, { ...input, title: 'Moved', startDate: '2026-10-05', startTime: '09:00', endDate: '2026-10-05', endTime: '09:30', alarmMin: null }, 'one', one.recurrenceId);
    const after = occurrences(edited, from, to);
    expect(after.map((o) => `${o.startDate} ${zonedClock(o.start)} ${o.title}`)).toContain('2026-10-05 09:00 Moved');
    expect(after).toHaveLength(3);
    const skipped = occurrences(skipOccurrence(weekly, occurrences(weekly, from, to)[2].recurrenceId!), from, to);
    expect(skipped.map((o) => o.startDate)).toEqual(['2026-10-05', '2026-10-19']);
  });
  it('rewrites the whole series and keeps its skipped dates', () => {
    const [from, to] = R('2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z');
    const all = editEvent(weekly, { ...input, title: 'School', startDate: '2026-10-05', startTime: '08:00', endDate: '2026-10-05', endTime: '08:45', repeat: 'weekly', alarmMin: null }, 'all', null);
    const occ = occurrences(all, from, to);
    expect(occ.map((o) => o.startDate)).not.toContain('2026-10-12');
    expect(occ.find((o) => o.startDate === '2026-10-26')?.title).toBe('School');
  });
});
