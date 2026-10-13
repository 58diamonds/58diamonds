'use client';

import Link from 'next/link';
import type { NavLink } from '@/lib/routes';
import type { Settings } from '@/lib/types';
import { useSite } from './SiteProvider';

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Ivory footer, kept to one quiet line: copyright and VAT, the footer menu, Instagram. */
export function SiteFooter({ links, settings }: { links: (NavLink & { text: string })[]; settings: Settings }) {
  const { t } = useSite();
  const ig = `https://www.instagram.com/${settings.instagram_handle}/`;
  const hover = 'transition-colors hover:text-[var(--color-gold)]';
  const name = settings.company_name || '58 Diamonds';

  return (
    <footer className="border-t border-[var(--color-line)] py-6 font-sans text-[0.62rem] uppercase tracking-[0.16em] text-[var(--color-stone)]">
      <div className="mx-auto flex max-w-[85rem] flex-col items-center gap-4 px-4 text-center sm:px-8 md:flex-row md:justify-between md:text-left">
        <p>
          © {new Date().getFullYear()} {name}
          {settings.vat_number && <> · {t('footer.vat')} {settings.vat_number}</>}
        </p>
        {links.length > 0 && (
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Footer">
            {links.map((l) =>
              l.external ? (
                <a key={l.id} href={l.href} target="_blank" rel="noreferrer" className={hover}>{l.text}</a>
              ) : (
                <Link key={l.id} href={l.href} className={hover}>{l.text}</Link>
              ),
            )}
          </nav>
        )}
        <a href={ig} target="_blank" rel="noreferrer" className={`text-[var(--color-ink)] ${hover}`} aria-label="Instagram">
          <InstagramIcon />
        </a>
      </div>
    </footer>
  );
}
