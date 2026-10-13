'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, weekday } from '@/lib/booking';
import { INTL_LOCALE } from '@/lib/i18n';
import { useSite } from './SiteProvider';

interface SlotsResponse {
  live: boolean;
  month?: string;
  first?: string;
  last?: string;
  unverified?: boolean;
  days?: Record<string, number[]>;
}

const TZ = 'Europe/Brussels';
const nextMonth = (m: string, n: number) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/**
 * Month calendar of free appointment times. Days with a free time can be
 * picked; then the times of that day. Calls `onLive(false)` when online
 * booking is off, so the form shows the plain "preferred days" field instead.
 */
export function BookingPicker({ value, onChange, onLive, reloadKey }: { value: number | null; onChange: (start: number | null) => void; onLive: (live: boolean) => void; reloadKey: number }) {
  const { locale, t } = useSite();
  const tag = INTL_LOCALE[locale];
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<SlotsResponse | null>(null);
  const [day, setDay] = useState<string | null>(null);

  const load = useCallback(
    async (m: string | null) => {
      const res = await fetch(`/api/booking/slots${m ? `?month=${m}` : ''}`, { cache: 'no-store' }).catch(() => null);
      const j = ((await res?.json().catch(() => null)) ?? { live: false }) as SlotsResponse;
      setData(j);
      onLive(j.live);
      if (j.live && j.month) setMonth(j.month);
    },
    [onLive],
  );

  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const days = useMemo(() => {
    if (!month) return [];
    const first = `${month}-01`;
    const lead = weekday(first) - 1;
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = first; d.startsWith(month); d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);

  if (!data?.live || !month) return null;
  const slots = data.days ?? {};
  const fmtMonth = new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(`${month}-01T12:00:00Z`));
  const fmtTime = (ms: number) => new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(ms);
  const fmtWeekday = (i: number) => new Intl.DateTimeFormat(tag, { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 1 + i));
  const fmtDay = (d: string) => new Intl.DateTimeFormat(tag, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(Date.parse(`${d}T12:00:00Z`));
  const go = (n: number) => {
    const m = nextMonth(month, n);
    setDay(null);
    onChange(null);
    setMonth(m);
    load(m);
  };
  const empty = Object.keys(slots).length === 0;

  if (value) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border border-[var(--color-line)] p-4">
        <p>{t('booking.chosen', { when: `${fmtDay(new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(value))}, ${fmtTime(value)}` })}</p>
        <button type="button" className="chip" onClick={() => onChange(null)}>
          {t('booking.change')}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-line)] p-4 sm:p-6">
      <p className="eyebrow">{t('booking.pick_day')}</p>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" className="chip" onClick={() => go(-1)} disabled={month <= (data.first ?? month)} aria-label="Previous month">
          ‹
        </button>
        <p className="font-display text-2xl capitalize">{fmtMonth}</p>
        <button type="button" className="chip" onClick={() => go(1)} disabled={month >= (data.last ?? month)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center" role="grid">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="pb-1 text-[0.62rem] uppercase tracking-[0.14em] text-[var(--color-stone)]">
            {fmtWeekday(i)}
          </span>
        ))}
        {days.map((d, i) =>
          d ? (
            <button
              key={d}
              type="button"
              disabled={!slots[d]}
              aria-pressed={day === d}
              onClick={() => setDay(d)}
              className={`aspect-square text-sm transition ${day === d ? 'bg-[var(--color-ink)] text-[var(--color-ivory)]' : slots[d] ? 'border border-[var(--color-gold-soft)] hover:border-[var(--color-gold)]' : 'text-[var(--color-stone)] opacity-40'}`}
            >
              {Number(d.slice(8))}
            </button>
          ) : (
            <span key={`x${i}`} />
          ),
        )}
      </div>
      {empty && <p className="mt-4 text-sm text-[var(--color-stone)]">{t('booking.none')}</p>}
      {day && slots[day] && (
        <div className="mt-6">
          <p className="eyebrow">{t('booking.pick_time')}</p>
          <p className="mt-1 text-sm capitalize text-[var(--color-stone)]">{fmtDay(day)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {slots[day].map((s) => (
              <button key={s} type="button" className="chip" onClick={() => onChange(s)}>
                {fmtTime(s)}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-[var(--color-stone)]">
        {t('booking.zone')} {data.unverified ? t('booking.unverified') : ''}
      </p>
    </div>
  );
}
