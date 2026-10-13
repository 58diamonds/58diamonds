import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppointmentForm } from '@/components/site/AppointmentForm';
import { WhatsAppIcon } from '@/components/site/icons';
import { whatsappLink } from '@/lib/format';
import { alternates, site } from '@/lib/site';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, t } = await site(params);
  return { title: t('contact.title'), description: t('contact.intro'), alternates: alternates(locale, '/contact') };
}

export default async function ContactPage({ params }: Props) {
  const { t, settings } = await site(params);
  const wa = whatsappLink(settings.whatsapp_number, t('whatsapp.message'));
  return (
    <div className="px-5 pt-16 sm:pt-20">
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <h1 className="page-title">{t('contact.eyebrow')}</h1>
          <p className="mx-auto mt-5 max-w-xl text-[var(--color-stone)]">{t('contact.intro')}</p>
        </header>

        <div className="mt-16 grid gap-16 md:grid-cols-[2fr_3fr]">
          <aside className="space-y-10">
            <p className="eyebrow">{t('contact.or')}</p>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="btn w-full border-[#25d366] bg-[#25d366] text-white hover:bg-transparent hover:text-[var(--color-ink)]">
                <WhatsAppIcon className="h-5 w-5" /> {t('whatsapp.label')}
              </a>
            )}
            {settings.phone && (
              <div>
                <p className="eyebrow">{t('form.phone')}</p>
                <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="font-display mt-2 block text-2xl">
                  {settings.phone}
                </a>
              </div>
            )}
            {settings.email && (
              <div>
                <p className="eyebrow">{t('form.email')}</p>
                <a href={`mailto:${settings.email}`} className="font-display mt-2 block break-all text-2xl">
                  {settings.email}
                </a>
              </div>
            )}
            {settings.address && (
              <div>
                <p className="eyebrow">{t('footer.appointment')}</p>
                <p className="mt-2 whitespace-pre-line">{settings.address}</p>
              </div>
            )}
            <div>
              <p className="eyebrow">Instagram</p>
              <a href={`https://www.instagram.com/${settings.instagram_handle}/`} target="_blank" rel="noreferrer" className="font-display mt-2 block text-2xl">
                @{settings.instagram_handle}
              </a>
            </div>
          </aside>
          <section id="appointment" className="scroll-mt-28">
            <Suspense>
              <AppointmentForm />
            </Suspense>
          </section>
        </div>
      </div>
    </div>
  );
}
