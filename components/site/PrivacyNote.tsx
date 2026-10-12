'use client';

import Link from 'next/link';
import { href } from '@/lib/routes';
import { useSite } from './SiteProvider';

/** One line under a form that collects personal details, with the privacy page (GDPR art. 13). */
export function PrivacyNote({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  const { locale, t } = useSite();
  return (
    <p className={`text-xs leading-relaxed ${dark ? 'text-white/60' : 'text-[var(--color-stone)]'} ${className}`}>
      {t('form.privacy')}{' '}
      <Link href={href.page(locale, 'privacy')} className="underline underline-offset-4 hover:text-[var(--color-gold)]">
        {t('form.privacy_link')}
      </Link>
    </p>
  );
}
