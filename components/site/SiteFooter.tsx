'use client';

import Link from 'next/link';
import { enterpriseNumber, whatsappLink } from '@/lib/format';
import type { NavLink } from '@/lib/routes';
import type { Settings } from '@/lib/types';
import { useSite } from './SiteProvider';

/** Ivory footer: the footer menu, then one line with the company, contact and Instagram. */
export function SiteFooter({ links, settings }: { links: (NavLink & { text: string })[]; settings: Settings }) {
  const { t } = useSite();
  const wa = whatsappLink(settings.whatsapp_number, t('whatsapp.message'));
  const ig = `https://www.instagram.com/${settings.instagram_handle}/`;
  const hover = 'transition-colors hover:text-[var(--color-gold)]';
  const company = [settings.company_name || '58 Diamonds', ...(settings.company_address ?? '').split('\n').map((l) => l.trim()).filter((l) => l && !/^belgi/i.test(l))].join(', ');

  return (
    <footer className="border-t border-[var(--color-line)] py-7 font-sans text-[0.66rem] uppercase tracking-[0.16em] text-[var(--color-stone)]">
      <div className="mx-auto flex max-w-[85rem] flex-col gap-5 px-4 sm:px-8">
        <nav className="flex flex-wrap gap-x-7 gap-y-2.5 text-[var(--color-ink)]" aria-label="Footer">
          {links.map((l) =>
            l.external ? (
              <a key={l.id} href={l.href} target="_blank" rel="noreferrer" className={hover}>{l.text}</a>
            ) : (
              <Link key={l.id} href={l.href} className={hover}>{l.text}</Link>
            ),
          )}
        </nav>
        <div className="flex flex-wrap justify-between gap-x-7 gap-y-2.5">
          <span>{company}</span>
          {settings.vat_number && (
            <span>
              {enterpriseNumber(settings.vat_number) && <>{t('footer.enterprise')} {enterpriseNumber(settings.vat_number)} · </>}
              {t('footer.vat')} {settings.vat_number}
            </span>
          )}
          <span className="flex flex-wrap gap-x-7 gap-y-2.5">
            {settings.email && <a href={`mailto:${settings.email}`} className={`normal-case tracking-[0.06em] ${hover}`}>{settings.email}</a>}
            {settings.phone && <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className={hover}>{settings.phone}</a>}
            {wa && <a href={wa} target="_blank" rel="noreferrer" className={hover}>WhatsApp</a>}
            <a href={ig} target="_blank" rel="noreferrer" className={hover}>Instagram</a>
          </span>
        </div>
        <p>© {new Date().getFullYear()} {settings.company_name || '58 Diamonds'}. {t('footer.rights')}</p>
      </div>
    </footer>
  );
}
