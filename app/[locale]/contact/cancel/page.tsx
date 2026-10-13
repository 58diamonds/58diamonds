import type { Metadata } from 'next';
import { formatWhen } from '@/lib/booking';
import { getBooking } from '@/lib/booking-flow';
import { site } from '@/lib/site';
import { CancelButton } from './CancelButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false } };

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ id?: string; token?: string }> };

/** The client's "Cancel or change" link from the confirmation email. */
export default async function CancelPage({ params, searchParams }: Props) {
  const { locale, t } = await site(params);
  const q = await searchParams;
  const b = q.id ? await getBooking(q.id) : null;
  const active = b && q.token === b.client_token && (b.status === 'pending' || b.status === 'confirmed') && Date.parse(b.starts_at) > Date.now();
  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center sm:py-24">
      <h1 className="page-title">{t('booking.cancel_title')}</h1>
      {active ? (
        <>
          <p className="mt-6 text-lg text-[var(--color-stone)]">{t('booking.cancel_text', { when: formatWhen(Date.parse(b.starts_at), locale) })}</p>
          <CancelButton id={b.id} token={b.client_token} label={t('booking.cancel_button')} done={t('booking.cancelled')} error={t('form.error')} />
        </>
      ) : (
        <p className="mt-6 text-lg text-[var(--color-stone)]">{t('booking.cancel_gone')}</p>
      )}
    </div>
  );
}
