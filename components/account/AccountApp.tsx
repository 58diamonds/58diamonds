'use client';

import { useSite } from '@/components/site/SiteProvider';
import { HAS_DATABASE } from '@/lib/config';
import { AccountHome } from './AccountHome';
import { AuthForms, NewPasswordForm } from './AuthForms';
import { useAccount } from './useAccount';

export function AccountApp() {
  const { t } = useSite();
  const { session, ready, recovering, setRecovering } = useAccount();
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 sm:pt-20">
      <header className="mb-14 text-center">
        <h1 className="font-display text-5xl sm:text-6xl">{t('account.title')}</h1>
        {!session && <p className="mx-auto mt-5 max-w-lg text-[var(--color-stone)]">{t('account.intro')}</p>}
      </header>
      {!HAS_DATABASE ? (
        <p className="text-center text-[var(--color-stone)]">{t('account.not_available')}</p>
      ) : !ready ? (
        <p className="text-center text-[var(--color-stone)]">{t('common.loading')}</p>
      ) : recovering && session ? (
        <NewPasswordForm onDone={() => setRecovering(false)} />
      ) : session ? (
        <AccountHome session={session} />
      ) : (
        <AuthForms />
      )}
    </div>
  );
}
