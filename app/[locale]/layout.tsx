import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteProvider } from '@/components/site/SiteProvider';
import { WhatsAppButton } from '@/components/site/WhatsAppButton';
import { SITE_NAME, SITE_URL } from '@/lib/config';
import { getFeatures, getMenu, getPages, getSections, getSettings, getTexts } from '@/lib/data';
import { fontVars } from '@/lib/fonts';
import { LOCALES, isLocale, tr, type Locale } from '@/lib/i18n';
import { resolveMenu } from '@/lib/routes';
import { makeT } from '@/lib/t';
import '../globals.css';

export const revalidate = 300;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const [texts, settings] = await Promise.all([getTexts(), getSettings()]);
  const t = makeT(texts, locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('seo.home_title'), template: `%s | ${SITE_NAME}` },
    description: t('seo.home_description'),
    openGraph: {
      siteName: SITE_NAME,
      type: 'website',
      locale: { en: 'en_GB', nl: 'nl_BE', fr: 'fr_BE' }[locale],
      images: settings.og_image_url ? [{ url: settings.og_image_url }] : undefined,
    },
    icons: { icon: '/brand/mark-gold.svg' },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const [settings, texts, menu, pages, sections, features] = await Promise.all([
    getSettings(),
    getTexts(),
    getMenu(),
    getPages(),
    getSections(),
    getFeatures(),
  ]);
  const ctx = { locale, pages, sections, features };
  const label = (links: ReturnType<typeof resolveMenu>) => links.map((l) => ({ ...l, text: tr(l.label, locale) }));
  const header = label(resolveMenu(menu, 'header', ctx));
  const footer = label(resolveMenu(menu, 'footer', ctx));
  const t = makeT(texts, locale);

  return (
    <html lang={locale} className={fontVars}>
      <body>
        <SiteProvider
          value={{
            locale,
            currency: settings.currency,
            texts: Object.fromEntries(Object.entries(texts).map(([k, v]) => [k, tr(v, locale)])),
            features: { shop: features.shop, accounts: features.accounts, wishlist: features.wishlist, newsletter: features.newsletter },
            whatsapp: settings.whatsapp_number,
          }}
        >
          <SiteHeader links={header} logo={settings.header_logo} privateJeweller={settings.private_jeweller === true} />
          <main id="main" className="pb-20">{children}</main>
          <SiteFooter links={footer} settings={settings} />
          <WhatsAppButton number={settings.whatsapp_number} label={t('whatsapp.label')} message={t('whatsapp.message')} />
        </SiteProvider>
      </body>
    </html>
  );
}
