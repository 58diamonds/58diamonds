import { describe, expect, it } from 'vitest';
import { DEFAULT_BOOKING, appointmentDates, freeSlots, hasHours, isFree, toConfig, weekday, zonedClock, zonedDate, zonedTime, type BookingConfig } from './booking';

const cfg: BookingConfig = { ...DEFAULT_BOOKING, enabled: true, notice_hours: 0, hours: { '2': [['10:00', '13:00']] }, duration_min: 60, buffer_min: 15, step_min: 30 };
const NOW = Date.parse('2026-10-01T00:00:00Z');

describe('Brussels time', () => {
  it('converts wall-clock time in summer and winter', () => {
    expect(new Date(zonedTime('2026-07-14', '10:00')).toISOString()).toBe('2026-07-14T08:00:00.000Z');
    expect(new Date(zonedTime('2026-12-14', '10:00')).toISOString()).toBe('2026-12-14T09:00:00.000Z');
  });
  it('handles the day summer time ends', () => {
    expect(new Date(zonedTime('2026-10-25', '12:00')).toISOString()).toBe('2026-10-25T11:00:00.000Z');
    expect(zonedClock(zonedTime('2026-10-25', '12:00'))).toBe('12:00');
  });
  it('knows weekdays and dates', () => {
    expect(weekday('2026-10-13')).toBe(2);
    expect(zonedDate(Date.parse('2026-10-13T22:30:00Z'))).toBe('2026-10-14');
  });
});

describe('free slots', () => {
  it('offers every step that fits in the opening hours', () => {
    const s = freeSlots(cfg, [], '2026-10-13', '2026-10-13', NOW)['2026-10-13'].map((x) => zonedClock(x));
    expect(s).toEqual(['10:00', '10:30', '11:00', '11:30', '12:00']);
  });
  it('keeps the buffer around busy times', () => {
    const busy = [{ start: zonedTime('2026-10-13', '11:00'), end: zonedTime('2026-10-13', '11:30') }];
    const s = freeSlots(cfg, busy, '2026-10-13', '2026-10-13', NOW)['2026-10-13'].map((x) => zonedClock(x));
    expect(s).toEqual(['12:00']);
  });
  it('skips closed dates, other weekdays and times inside the notice', () => {
    expect(freeSlots({ ...cfg, closed_dates: ['2026-10-13'] }, [], '2026-10-13', '2026-10-13', NOW)).toEqual({});
    expect(freeSlots(cfg, [], '2026-10-14', '2026-10-14', NOW)).toEqual({});
    const late = zonedTime('2026-10-13', '10:40');
    expect(freeSlots({ ...cfg, notice_hours: 1 }, [], '2026-10-13', '2026-10-13', late)['2026-10-13'].map((x) => zonedClock(x))).toEqual(['12:00']);
  });
  it('checks one exact start', () => {
    expect(isFree(cfg, [], zonedTime('2026-10-13', '10:30'), NOW)).toBe(true);
    expect(isFree(cfg, [], zonedTime('2026-10-13', '10:40'), NOW)).toBe(false);
  });
  it('reads a settings row safely', () => {
    const c = toConfig({ enabled: true, ics_links: [{ name: 'School', url: 'https://x' }, { url: '' }] });
    expect(c.ics_links).toEqual([{ name: 'School', url: 'https://x', busy: true, allday_blocks: false }]);
    expect(c.busy_calendars).toBeNull();
  });
});

describe('by appointment only', () => {
  // cfg has hours on Tuesday only. 2026-11-03 is a Tuesday, 2026-11-04 a Wednesday.
  const now = Date.parse('2026-11-01T09:00:00Z');
  const appt: BookingConfig = { ...cfg, hours: { '2': [['10:00', '13:00']], '3': [] }, closed_dates: ['2026-11-05'] };

  it('lists the days without opening hours, without closed days', () => {
    expect(appointmentDates(appt, '2026-11-03', '2026-11-06', now)).toEqual(['2026-11-04', '2026-11-06']);
  });

  it('lists nothing while no day has opening hours', () => {
    expect(appointmentDates({ ...cfg, hours: {} }, '2026-11-03', '2026-11-06', now)).toEqual([]);
    expect(hasHours({ ...cfg, hours: { '3': [] } })).toBe(false);
    expect(hasHours(appt)).toBe(true);
  });
});
