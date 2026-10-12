'use client';

import Link from 'next/link';
import { href } from '@/lib/routes';
import { useSite } from '@/components/site/SiteProvider';

export default function NotFound() {
  const { locale, t } = useSite();
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center px-5 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-display mt-3 text-5xl">{t('notfound.title')}</h1>
      <p className="mt-4 text-[var(--color-stone)]">{t('notfound.text')}</p>
      <Link href={href.home(locale)} className="btn btn-dark mt-10">
        {t('common.home')}
      </Link>
    </div>
  );
}
