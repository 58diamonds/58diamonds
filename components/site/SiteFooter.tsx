'use client';

import Link from 'next/link';
import { enterpriseNumber, whatsappLink } from '@/lib/format';
import type { NavLink } from '@/lib/routes';
import type { Settings } from '@/lib/types';
import { useSite } from './SiteProvider';

/** Footer links to these pages go under Legal notice; the rest under Client care. */
const LEGAL_SLUGS = ['terms', 'returns', 'privacy', 'cookies', 'withdrawal'];

/** Fixed bottom line credit. Deliberately not in Admin > Texts, so it can't be edited there. */
function ForgedBy() {
  return (
    <a
      href="https://18forge.com"
      aria-label="Forged by 18 Forge"
      className="inline-flex items-center gap-[0.35em] whitespace-nowrap no-underline transition-colors duration-200 hover:text-[var(--color-18forge)] focus-visible:text-[var(--color-18forge)]"
    >
      Forged by
      <svg viewBox="0 0 135.15 100" fill="currentColor" aria-hidden="true" focusable="false" style={{ height: '1em', width: 'auto' }}>
        <path fillRule="evenodd" d="M56.08 0.4A0.3 0.3 0 0 0 55.8 0L42.51 0A10.48 10.48 0 0 0 32.63 6.99L0.02 99.55A0.34 0.34 0 0 0 0.34 100L13.81 100A10.8 10.8 0 0 0 24.01 92.74ZM118.34 50.49A2.63 2.63 0 0 1 118.64 47.64L130.62 32.92A20.18 20.18 0 0 0 114.97 0L80.55 0A24.06 24.06 0 0 0 58.73 34.2L64.38 46.34A3.28 3.28 0 0 1 63.75 50.02L46.31 67.89A18.91 18.91 0 0 0 59.85 100L103.98 100A24.27 24.27 0 0 0 125.59 64.67ZM64.37 79.85A0.74 0.74 0 0 1 63.83 78.61L85.79 55.45A8.97 8.97 0 0 0 87.22 45.09L77.42 26.53A4.42 4.42 0 0 1 81.33 20.05L112.63 20.05A1.18 1.18 0 0 1 113.54 21.99L96.52 42.44A8.62 8.62 0 0 0 95.58 52.09L107.3 73.51A4.29 4.29 0 0 1 103.54 79.85Z" />
      </svg>
    </a>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-[var(--color-line)] md:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[var(--color-ink)] md:py-2 [&::-webkit-details-marker]:hidden">
        {title}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" className="transition-transform group-open:rotate-180" aria-hidden="true">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </summary>
      <div className="flex flex-col gap-3 pb-5 pt-1">{children}</div>
    </details>
  );
}

/** Ivory footer, Cartier style: Client care and Legal notice fold open, Instagram, then one fixed line. */
export function SiteFooter({ links, settings }: { links: (NavLink & { text: string })[]; settings: Settings }) {
  const { t } = useSite();
  const wa = whatsappLink(settings.whatsapp_number, t('whatsapp.message'));
  const ig = `https://www.instagram.com/${settings.instagram_handle}/`;
  const hover = 'transition-colors hover:text-[var(--color-gold)]';
  const company = settings.company_name || '58 Diamonds';
  const address = (settings.company_address ?? '').split('\n').map((l) => l.trim()).filter(Boolean).join(', ');
  const isLegal = (l: NavLink) => LEGAL_SLUGS.includes(l.href.split(/[?#]/)[0].split('/').pop() ?? '');
  const link = (l: NavLink & { text: string }) =>
    l.external ? (
      <a key={l.id} href={l.href} target="_blank" rel="noreferrer" className={hover}>{l.text}</a>
    ) : (
      <Link key={l.id} href={l.href} className={hover}>{l.text}</Link>
    );

  return (
    <footer className="border-t border-[var(--color-line)] font-sans text-[0.66rem] uppercase tracking-[0.16em] text-[var(--color-stone)]">
      <div className="mx-auto max-w-[85rem] px-4 pt-4 sm:px-8 md:pt-8">
        <div className="md:grid md:grid-cols-3 md:gap-10">
          <Section title={t('footer.client_care')}>
            {links.filter((l) => !isLegal(l)).map(link)}
            {settings.email && <a href={`mailto:${settings.email}`} className={`normal-case tracking-[0.06em] ${hover}`}>{settings.email}</a>}
            {settings.phone && <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className={hover}>{settings.phone}</a>}
            {wa && <a href={wa} target="_blank" rel="noreferrer" className={hover}>WhatsApp</a>}
          </Section>
          <Section title={t('footer.legal')}>
            {links.filter(isLegal).map(link)}
            <div className="mt-2 flex flex-col gap-1.5 normal-case tracking-[0.04em] leading-relaxed">
              {settings.legal_name && <p>{t('footer.trade_name').replace('{company}', company).replace('{name}', settings.legal_name)}</p>}
              {address && <p>{address}</p>}
              {settings.vat_number && (
                <p>
                  {enterpriseNumber(settings.vat_number) && <>{t('footer.enterprise')} {enterpriseNumber(settings.vat_number)} · </>}
                  {t('footer.vat')} {settings.vat_number}
                </p>
              )}
            </div>
          </Section>
          <div className="flex flex-col items-center gap-4 py-8 md:items-start md:py-2">
            <span className="text-[var(--color-ink)]">{t('footer.follow')}</span>
            <a href={ig} target="_blank" rel="noreferrer" className={`text-[var(--color-ink)] ${hover}`} aria-label="Instagram">
              <InstagramIcon />
            </a>
          </div>
        </div>
      </div>
      <p className="mt-2 border-t border-[var(--color-line)] px-4 py-5 text-center text-[0.6rem]">
        © {new Date().getFullYear()} 58 Diamonds · <ForgedBy />
      </p>
    </footer>
  );
}
