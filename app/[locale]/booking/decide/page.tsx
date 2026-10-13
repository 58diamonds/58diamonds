import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatWhen } from '@/lib/booking';
import { getBooking } from '@/lib/booking-flow';
import { DecideForm } from './DecideForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Appointment request', robots: { index: false } };

type Props = { searchParams: Promise<{ id?: string; token?: string; action?: string }> };

/**
 * Where Farah's Approve / Decline email buttons lead. Opening the link changes
 * nothing (mail apps open links on their own to scan them); she confirms with
 * the button here.
 */
export default async function DecidePage({ searchParams }: Props) {
  const q = await searchParams;
  const b = q.id ? await getBooking(q.id) : null;
  if (!b || q.token !== b.decision_token) notFound();
  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center sm:py-24">
      <h1 className="page-title">Appointment request</h1>
      <p className="font-display mt-6 text-3xl">{b.name}</p>
      <p className="mt-2 text-[var(--color-stone)]">{formatWhen(Date.parse(b.starts_at), 'en')}</p>
      <p className="mt-1 text-sm text-[var(--color-stone)]">{[b.email, b.phone].filter(Boolean).join(' · ')}</p>
      {b.message && <p className="mx-auto mt-6 max-w-md whitespace-pre-line text-left text-sm">{b.message}</p>}
      <DecideForm id={b.id} token={b.decision_token} status={b.status} initial={q.action === 'decline' ? 'decline' : 'approve'} />
    </div>
  );
}
