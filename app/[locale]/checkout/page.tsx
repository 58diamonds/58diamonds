import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckoutView } from '@/components/site/CheckoutView';
import { deliveryCountries } from '@/lib/shipping';
import { site } from '@/lib/site';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await site(params);
  return { title: t('checkout.title'), robots: { index: false } };
}

export default async function CheckoutPage({ params }: Props) {
  const { settings } = await site(params);
  return (
    <Suspense>
      <CheckoutView countries={deliveryCountries(settings)} />
    </Suspense>
  );
}
