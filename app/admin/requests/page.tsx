'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Help, PageTitle, Button } from '@/components/admin/ui';
import { adminFetch } from '@/lib/admin-client';
import { zonedClock, zonedDate, zonedTime } from '@/lib/booking';
import { getAdminDb } from '@/lib/supabase';
import type { AppointmentRequest } from '@/lib/types';

/** Appointment requests sent through the website's form, newest first. */
export default function RequestsAdmin() {
  const db = getAdminDb();
  const [rows, setRows] = useState<AppointmentRequest[] | null>(null);
  const [showHandled, setShowHandled] = useState(false);

  const load = useCallback(async () => {
    const { data } = await db.from('appointment_requests').select('*').order('created_at', { ascending: false }).limit(200);
    setRows((data ?? []) as AppointmentRequest[]);
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  async function mark(r: AppointmentRequest, handled: boolean) {
    await db.from('appointment_requests').update({ handled }).eq('id', r.id);
    load();
  }

  const [working, setWorking] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  /** Approve, decline or move a booking made in the calendar; the client is emailed. */
  async function decide(r: AppointmentRequest, action: 'approve' | 'decline' | 'move', extra: Record<string, unknown> = {}) {
    setWorking(r.id);
    setProblem(null);
    try {
      await adminFetch('/api/booking/decide', { id: r.id, action, ...extra });
      await load();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(null);
    }
  }

  function decline(r: AppointmentRequest) {
    const note = window.prompt(`Decline ${r.name}'s request? You can add a message for the client, for example another time you suggest (optional).`, '');
    if (note === null) return;
    decide(r, 'decline', { note });
  }

  function move(r: AppointmentRequest) {
    const s = Date.parse(r.starts_at!);
    const v = window.prompt('New day and time (Brussels time), as YYYY-MM-DD HH:MM', `${zonedDate(s)} ${zonedClock(s)}`);
    const m = v?.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/);
    if (!v) return;
    if (!m) return setProblem('Write the new time as YYYY-MM-DD HH:MM, for example 2026-11-04 14:30.');
    decide(r, 'move', { start: zonedTime(m[1], m[2]) });
  }

  async function remove(r: AppointmentRequest) {
    if (!window.confirm(`Delete the request from ${r.name}?`)) return;
    await db.from('appointment_requests').delete().eq('id', r.id);
    load();
  }

  if (!rows) return <p className="text-sm text-[var(--color-stone)]">Loading...</p>;
  const open = rows.filter((r) => !r.handled);
  const shown = showHandled ? rows : open;

  return (
    <div>
      <PageTitle title="Requests">
        <Button onClick={() => setShowHandled((s) => !s)}>{showHandled ? 'Hide done' : `Show done (${rows.length - open.length})`}</Button>
      </PageTitle>
      <Help>
        Appointment requests from the contact form. Requests with a time picked in the booking calendar wait for you to approve or decline them; the client gets an email either way. Other requests: reply by phone, WhatsApp or email, then mark them as done.
      </Help>
      {problem && <p className="mb-4 text-sm text-red-800" role="alert">{problem}</p>}
      {shown.length === 0 && <p className="text-sm text-[var(--color-stone)]">No open requests.</p>}
      <ul className="space-y-3">
        {shown.map((r) => {
          const wa = r.phone ? `https://wa.me/${r.phone.replace(/\D/g, '').replace(/^00/, '')}` : null;
          return (
            <li key={r.id} className={`border bg-white border-[var(--color-line)] p-4 ${r.handled ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-lg">{r.name}</p>
                <p className="text-xs text-[var(--color-stone)]">
                  {new Date(r.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} {r.handled && <Badge>Done</Badge>}
                </p>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
                {r.email && <a href={`mailto:${r.email}`} className="underline underline-offset-4">{r.email}</a>}
                {r.phone && <a href={`tel:${r.phone}`} className="underline underline-offset-4">{r.phone}</a>}
                {wa && <a href={wa} target="_blank" rel="noreferrer" className="underline underline-offset-4">WhatsApp</a>}
              </div>
              {r.starts_at && (
                <p className="mt-2 text-sm">
                  <span className="text-[var(--color-stone)]">Booked for:</span>{' '}
                  {new Date(r.starts_at).toLocaleString('en-GB', { timeZone: 'Europe/Brussels', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}{' '}
                  <Badge tone={r.status === 'pending' ? 'warn' : r.status === 'confirmed' ? 'gold' : 'quiet'}>{r.status === 'pending' ? 'To approve' : r.status}</Badge>
                </p>
              )}
              {r.decision_note && <p className="mt-1 text-sm text-[var(--color-stone)]">Your message: {r.decision_note}</p>}
              {r.preferred_date && <p className="mt-2 text-sm"><span className="text-[var(--color-stone)]">Prefers:</span> {r.preferred_date}</p>}
              {r.message && <p className="mt-2 whitespace-pre-line text-sm">{r.message}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === 'pending' && (
                  <>
                    <Button tone="dark" disabled={working === r.id} onClick={() => decide(r, 'approve')}>Approve</Button>
                    <Button disabled={working === r.id} onClick={() => decline(r)}>Decline</Button>
                  </>
                )}
                {(r.status === 'pending' || r.status === 'confirmed') && r.starts_at && Date.parse(r.starts_at) > Date.now() && (
                  <Button disabled={working === r.id} onClick={() => move(r)}>Move</Button>
                )}
                {!r.status && <Button onClick={() => mark(r, !r.handled)}>{r.handled ? 'Reopen' : 'Mark as done'}</Button>}
                <Button tone="danger" onClick={() => remove(r)}>Delete</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
