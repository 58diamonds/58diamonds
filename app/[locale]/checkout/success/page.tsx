import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckoutSuccess } from '@/components/site/CheckoutSuccess';
import { site } from '@/lib/site';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await site(params);
  return { title: t('checkout.thanks_title'), robots: { index: false } };
}

export default async function SuccessPage({ params }: Props) {
  await site(params);
  return (
    <Suspense>
      <CheckoutSuccess />
    </Suspense>
  );
}
