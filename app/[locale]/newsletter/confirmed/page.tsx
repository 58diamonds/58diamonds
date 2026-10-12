import Link from 'next/link';
import { href } from '@/lib/routes';
import { site } from '@/lib/site';

export const metadata = { robots: { index: false } };

export default async function Confirmed({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t } = await site(params);
  return (
    <div className="mx-auto max-w-xl px-5 py-28 text-center">
      <h1 className="font-display text-4xl">{t('newsletter.thanks')}</h1>
      <Link href={href.home(locale)} className="btn btn-dark mt-10">
        {t('common.home')}
      </Link>
    </div>
  );
}
