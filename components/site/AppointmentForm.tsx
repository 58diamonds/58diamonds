'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { PrivacyNote } from './PrivacyNote';
import { useSite } from './SiteProvider';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** The appointment request form. Farah sees requests under Requests in the admin and gets an email. */
export function AppointmentForm() {
  const { locale, t } = useSite();
  const piece = useSearchParams().get('piece');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? '').trim();
    // A field people cannot see. Bots fill it in; people do not.
    if (get('website')) return setStatus('sent');
    if (!get('email') && !get('phone')) return setError(t('form.reach'));

    setError(null);
    setStatus('sending');
    const res = await fetch('/api/appointment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: get('name'),
        email: get('email') || null,
        phone: get('phone') || null,
        preferred_date: get('preferred_date') || null,
        message: get('message'),
        piece,
        locale,
      }),
    }).catch(() => null);
    if (!res?.ok) {
      setStatus('error');
      setError(t('form.error'));
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="border border-[var(--color-line)] p-8 text-center" role="status">
        <p className="font-display text-3xl">{t('checkout.thanks_title')}</p>
        <p className="mt-3 text-[var(--color-stone)]">{t('form.sent')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 sm:grid-cols-2">
      {piece && <p className="text-sm text-[var(--color-gold)] sm:col-span-2">{piece}</p>}
      <label className="sm:col-span-2">
        <span className="eyebrow">{t('form.name')}</span>
        <input name="name" required maxLength={200} autoComplete="name" className="field" />
      </label>
      <label>
        <span className="eyebrow">{t('form.email')}</span>
        <input name="email" type="email" maxLength={200} autoComplete="email" className="field" />
      </label>
      <label>
        <span className="eyebrow">{t('form.phone')}</span>
        <input name="phone" type="tel" maxLength={50} autoComplete="tel" className="field" />
      </label>
      <label className="sm:col-span-2">
        <span className="eyebrow">{t('form.date')}</span>
        <input name="preferred_date" maxLength={100} className="field" />
      </label>
      <label className="sm:col-span-2">
        <span className="eyebrow">{t('form.message')}</span>
        <textarea name="message" rows={4} maxLength={3500} className="field resize-y" />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {error && <p className="text-sm text-red-800 sm:col-span-2" role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={status === 'sending'} className="btn btn-dark w-full sm:w-auto">
          {status === 'sending' ? t('common.loading') : t('form.send')}
        </button>
      </div>
      <PrivacyNote className="mt-4" />
    </form>
  );
}
