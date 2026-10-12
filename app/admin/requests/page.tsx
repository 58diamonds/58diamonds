'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Help, PageTitle, Button } from '@/components/admin/ui';
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
      <Help>Appointment requests from the contact form. Reply by phone, WhatsApp or email, then mark the request as done.</Help>
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
              {r.preferred_date && <p className="mt-2 text-sm"><span className="text-[var(--color-stone)]">Prefers:</span> {r.preferred_date}</p>}
              {r.message && <p className="mt-2 whitespace-pre-line text-sm">{r.message}</p>}
              <div className="mt-3 flex gap-2">
                <Button onClick={() => mark(r, !r.handled)}>{r.handled ? 'Reopen' : 'Mark as done'}</Button>
                <Button tone="danger" onClick={() => remove(r)}>Delete</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
