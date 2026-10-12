'use client';

import { useState } from 'react';
import { useSite } from './SiteProvider';

export function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const { locale, t } = useSite();
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get('website')) return setState('done');
    setState('sending');
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), locale }),
    }).catch(() => null);
    setState(res?.ok ? 'done' : 'error');
  }

  if (state === 'done') return <p className={`text-sm ${dark ? 'text-[var(--color-gold-soft)]' : 'text-[var(--color-gold)]'}`}>{t('newsletter.thanks')}</p>;

  return (
    <form onSubmit={submit}>
      <div className="flex items-end gap-3">
      <label className="flex-1">
        <span className="sr-only">{t('newsletter.placeholder')}</span>
        <input
          type="email"
          name="email"
          required
          maxLength={200}
          autoComplete="email"
          placeholder={t('newsletter.placeholder')}
          className={`field ${dark ? 'border-white/25 text-white placeholder:text-white/40' : ''}`}
        />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <button type="submit" disabled={state === 'sending'} className={`btn ${dark ? 'btn-on-dark' : 'btn-dark'} !min-h-10 !px-4`}>
        {t('newsletter.button')}
      </button>
      </div>
      {state === 'error' && (
        <p role="alert" className={`mt-2 text-sm ${dark ? 'text-red-200' : 'text-red-800'}`}>
          {t('newsletter.error')}
        </p>
      )}
    </form>
  );
}
