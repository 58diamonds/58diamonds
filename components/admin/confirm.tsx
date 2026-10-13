'use client';

import { useEffect, useState } from 'react';

type Ask = { message: string; resolve: (ok: boolean) => void };
let show: ((ask: Ask) => void) | null = null;

/**
 * In-page "Are you sure?" box. Used instead of the browser's own confirm,
 * which some phone browsers and in-app browsers block or never show, so
 * Delete buttons did nothing there.
 */
export function askConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (show) show({ message, resolve });
    else resolve(window.confirm(message));
  });
}

/** Mounted once in the admin layout. */
export function ConfirmHost() {
  const [ask, setAsk] = useState<Ask | null>(null);

  useEffect(() => {
    show = setAsk;
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (!ask) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask]);

  function close(ok: boolean) {
    ask?.resolve(ok);
    setAsk(null);
  }

  if (!ask) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => close(false)}>
      <div role="alertdialog" aria-modal="true" className="w-full max-w-sm bg-[var(--color-ivory)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm leading-relaxed">{ask.message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => close(false)} className="border border-[var(--color-line)] bg-white px-4 py-2.5 text-xs uppercase tracking-[0.14em]">
            Cancel
          </button>
          <button type="button" autoFocus onClick={() => close(true)} className="border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 py-2.5 text-xs uppercase tracking-[0.14em] text-[var(--color-ivory)]">
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
