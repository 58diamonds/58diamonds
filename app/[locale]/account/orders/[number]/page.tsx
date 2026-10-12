import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderDetail } from '@/components/account/OrderDetail';
import { site } from '@/lib/site';

type Props = { params: Promise<{ locale: string; number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await site(params);
  return { title: t('account.orders'), robots: { index: false } };
}

export default async function OrderPage({ params }: Props) {
  await site(params);
  const number = Number((await params).number);
  if (!Number.isInteger(number) || number < 1) notFound();
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 sm:pt-20">
      <OrderDetail number={number} />
    </div>
  );
}
