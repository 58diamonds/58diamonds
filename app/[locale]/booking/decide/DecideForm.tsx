'use client';

import { useState } from 'react';

/** Approve or decline, with an optional note to the client when declining. */
export function DecideForm({ id, token, status, initial }: { id: string; token: string; status: string; initial: 'approve' | 'decline' }) {
  const [action, setAction] = useState(initial);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | string>(status === 'pending' ? 'idle' : `This request is already ${status}.`);

  async function send() {
    setState('busy');
    const res = await fetch('/api/booking/decide', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, token, action, note }),
    }).catch(() => null);
    const j = (await res?.json().catch(() => ({}))) as { error?: string };
    setState(res?.ok ? 'done' : j.error || 'Something went wrong. Please try again.');
  }

  if (state === 'done') {
    return <p className="mt-10 text-lg" role="status">{action === 'approve' ? 'Approved. The client has been sent the confirmation, and the appointment is in your calendar.' : 'Declined. The client has been told and the time is free again.'}</p>;
  }
  if (state !== 'idle' && state !== 'busy') return <p className="mt-10" role="alert">{state}</p>;
  return (
    <div className="mt-10 space-y-6">
      <div className="flex justify-center gap-2">
        <button type="button" className="chip" aria-pressed={action === 'approve'} onClick={() => setAction('approve')}>
          Approve
        </button>
        <button type="button" className="chip" aria-pressed={action === 'decline'} onClick={() => setAction('decline')}>
          Decline
        </button>
      </div>
      {action === 'decline' && (
        <label className="block text-left">
          <span className="eyebrow">Message to the client (optional), for example another time you suggest</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} className="field resize-y" />
        </label>
      )}
      <button type="button" disabled={state === 'busy'} onClick={send} className="btn btn-dark w-full sm:w-auto">
        {state === 'busy' ? 'One moment...' : action === 'approve' ? 'Confirm the appointment' : 'Decline the request'}
      </button>
    </div>
  );
}
