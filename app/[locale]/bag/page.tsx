import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BagView } from '@/components/site/BagView';
import { catalogFor } from '@/lib/catalog';
import { deliveryCountries } from '@/lib/shipping';
import { site } from '@/lib/site';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await site(params);
  return { title: t('cart.title'), robots: { index: false } };
}

export default async function BagPage({ params }: Props) {
  const { locale, t, settings, sections } = await site(params);
  const catalog = await catalogFor(locale, t, settings, sections);
  return (
    <Suspense>
      <BagView
        catalog={catalog}
        shipping={{ flat: settings.shipping_flat, freeFrom: settings.free_shipping_from, rates: settings.shipping_rates, countries: deliveryCountries(settings) }}
        giftWrap={settings.gift_wrap_enabled ? settings.gift_wrap_price : null}
      />
    </Suspense>
  );
}
