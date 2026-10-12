import type { Metadata } from 'next';
import { AccountApp } from '@/components/account/AccountApp';
import { site } from '@/lib/site';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await site(params);
  return { title: t('account.title'), robots: { index: false } };
}

export default async function AccountPage({ params }: Props) {
  await site(params);
  return <AccountApp />;
}
