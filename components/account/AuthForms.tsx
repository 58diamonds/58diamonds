'use client';

import { useState } from 'react';
import { PasswordInput } from '@/components/PasswordInput';
import { PrivacyNote } from '@/components/site/PrivacyNote';
import { useSite } from '@/components/site/SiteProvider';
import { href } from '@/lib/routes';
import { getBrowserDb } from '@/lib/supabase';
import { claim } from './useAccount';

type Mode = 'sign-in' | 'sign-up' | 'forgot';

/** Sign in, create an account, or ask for a new password, with email and password. */
export function AuthForms() {
  const { locale, t } = useSite();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const name = String(form.get('name') ?? '').trim();
    const db = getBrowserDb();
    const back = `${window.location.origin}${href.account(locale)}`;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'sign-in') {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) setMessage({ kind: 'error', text: t('account.wrong') });
      } else if (mode === 'sign-up') {
        const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: back, data: { name, locale } } });
        if (error) setMessage({ kind: 'error', text: error.message });
        else if (data.session) await claim(data.session.access_token, { name, locale });
        else setMessage({ kind: 'ok', text: t('account.check_email') });
      } else {
        await db.auth.resetPasswordForEmail(email, { redirectTo: back });
        setMessage({ kind: 'ok', text: t('account.reset_sent') });
      }
    } finally {
      setBusy(false);
    }
  }

  const switchTo = (m: Mode) => {
    setMode(m);
    setMessage(null);
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="space-y-6">
        <h2 className="font-display text-3xl">{mode === 'sign-up' ? t('account.sign_up') : mode === 'forgot' ? t('account.forgot') : t('account.sign_in')}</h2>
        {mode === 'sign-up' && (
          <label className="block">
            <span className="eyebrow">{t('account.name')}</span>
            <input name="name" required maxLength={200} autoComplete="name" className="field" />
          </label>
        )}
        <label className="block">
          <span className="eyebrow">{t('account.email')}</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" className="field" />
        </label>
        {mode !== 'forgot' && (
          <label className="block">
            <span className="eyebrow">{t('account.password')}</span>
            <PasswordInput
              name="password"
              showLabel={t('account.show_password')}
              hideLabel={t('account.hide_password')}
              required
              minLength={mode === 'sign-up' ? 8 : undefined}
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              className="field"
            />
            {mode === 'sign-up' && <span className="mt-1 block text-xs text-[var(--color-stone)]">{t('account.password_hint')}</span>}
          </label>
        )}
        {message && (
          <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${message.kind === 'error' ? 'text-red-800' : 'text-[var(--color-gold)]'}`}>
            {message.text}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn btn-dark w-full">
          {busy ? t('common.loading') : mode === 'sign-up' ? t('account.sign_up') : mode === 'forgot' ? t('account.reset') : t('account.sign_in')}
        </button>
        {mode === 'sign-up' && <PrivacyNote />}
      </form>

      <div className="mt-8 space-y-3 text-center text-sm">
        {mode === 'sign-in' && (
          <>
            <button type="button" onClick={() => switchTo('forgot')} className="underline underline-offset-4 hover:text-[var(--color-gold)]">
              {t('account.forgot')}
            </button>
            <p>
              {t('account.no_account')}{' '}
              <button type="button" onClick={() => switchTo('sign-up')} className="underline underline-offset-4 hover:text-[var(--color-gold)]">
                {t('account.sign_up')}
              </button>
            </p>
          </>
        )}
        {mode !== 'sign-in' && (
          <p>
            {t('account.have_account')}{' '}
            <button type="button" onClick={() => switchTo('sign-in')} className="underline underline-offset-4 hover:text-[var(--color-gold)]">
              {t('account.sign_in')}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

/** Shown after following a password-reset email. */
export function NewPasswordForm({ onDone }: { onDone: () => void }) {
  const { t } = useSite();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get('password') ?? '');
    setBusy(true);
    const { error: err } = await getBrowserDb().auth.updateUser({ password });
    setBusy(false);
    if (err) setError(err.message);
    else onDone();
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-6">
      <h2 className="font-display text-3xl">{t('account.new_password')}</h2>
      <label className="block">
        <span className="eyebrow">{t('account.password')}</span>
        <PasswordInput name="password" showLabel={t('account.show_password')} hideLabel={t('account.hide_password')} required minLength={8} autoComplete="new-password" className="field" />
        <span className="mt-1 block text-xs text-[var(--color-stone)]">{t('account.password_hint')}</span>
      </label>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-dark w-full">
        {t('account.save')}
      </button>
    </form>
  );
}
