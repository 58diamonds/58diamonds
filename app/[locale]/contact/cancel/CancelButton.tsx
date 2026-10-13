'use client';

import { useState } from 'react';

export function CancelButton({ id, token, label, done, error }: { id: string; token: string; label: string; done: string; error: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  async function cancel() {
    setState('busy');
    const res = await fetch('/api/booking/cancel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, token }) }).catch(() => null);
    setState(res?.ok ? 'done' : 'error');
  }
  if (state === 'done') return <p className="mt-10 text-lg" role="status">{done}</p>;
  return (
    <div className="mt-10">
      {state === 'error' && <p className="mb-4 text-sm text-red-800" role="alert">{error}</p>}
      <button type="button" onClick={cancel} disabled={state === 'busy'} className="btn btn-dark">
        {label}
      </button>
    </div>
  );
}
