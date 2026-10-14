'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cart, cartCount } from '@/lib/cart';
import { LOCALES } from '@/lib/i18n';
import { href, type NavLink } from '@/lib/routes';
import type { HeaderLogo } from '@/lib/types';
import { BagIcon, HeartIcon, UserIcon } from './icons';
import { PrivateJeweller } from './PrivateJeweller';
import { useSite } from './SiteProvider';

type Link_ = NavLink & { text: string };

/** Same page in another language: swap the first part of the address. */
function switchLocale(pathname: string, to: string) {
  const parts = pathname.split('/');
  parts[1] = to;
  return parts.join('/') || `/${to}`;
}

export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { locale } = useSite();
  const pathname = usePathname();
  return (
    <span className={`text-[0.68rem] tracking-[0.2em] text-[var(--color-stone)] ${className}`}>
      {LOCALES.map((l, i) => (
        <span key={l}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          {l === locale ? (
            <span className="text-[var(--color-ink)]" aria-current="true">{l.toUpperCase()}</span>
          ) : (
            <Link href={switchLocale(pathname, l)} hrefLang={l} lang={l} className="hover:text-[var(--color-gold)]">
              {l.toUpperCase()}
            </Link>
          )}
        </span>
      ))}
    </span>
  );
}

const LOGO_SRC: Record<HeaderLogo, string> = {
  ink: '/brand/logo-ink.svg?v=3',
  black: '/brand/logo-black.svg?v=3',
  'brown-gold': '/brand/logo-brown-gold.svg?v=3',
};

/**
 * Ivory header: languages on the left, the logo in the middle, wishlist (and,
 * once the shop is live, account and bag) on the right, the menu underneath.
 * On phones the menu opens from the button on the left.
 */
export function SiteHeader({ links, logo = 'ink', privateJeweller = false }: { links: Link_[]; logo?: HeaderLogo; privateJeweller?: boolean }) {
  const { locale, t, features } = useSite();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const count = cartCount(cart.use());

  useEffect(() => setOpen(false), [pathname]);
  // The homepage photo fills the screen under the header, so it needs the header's height.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (l: Link_) => Boolean(l.match && (pathname === l.match || pathname.startsWith(`${l.match}/`)));
  const iconLink = 'relative flex h-10 w-10 items-center justify-center transition-colors hover:text-[var(--color-gold)]';

  return (
    <header ref={ref} className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-ivory)]">
      <div className="mx-auto grid max-w-[85rem] grid-cols-[1fr_auto_1fr] items-center px-4 pb-1.5 pt-3 sm:px-8 md:pb-0 md:pt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative -ml-2 flex h-10 w-10 items-center justify-center md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t('nav.close_menu') : t('nav.open_menu')}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-6">
              <span className={`absolute left-0 h-px w-6 bg-current transition ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 h-px w-6 bg-current transition ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
            </span>
          </button>
          <LanguageSwitch className="hidden font-sans md:inline" />
        </div>

        <Link href={href.home(locale)} className="block justify-self-center pb-1.5" aria-label="58 Diamonds">
          {/* The box keeps the band height; the logo sits a little smaller inside it. */}
          <span className="flex h-[6.25rem] items-center justify-center md:h-[clamp(6.25rem,10vw,8.5rem)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC[logo] ?? LOGO_SRC.ink} alt="58 Diamonds" className="h-[88%] w-auto" />
          </span>
          {privateJeweller && <PrivateJeweller logo={logo} className="mt-0.5 pl-[0.26em] text-[0.82rem] md:mt-1 md:text-[0.9rem]" />}
        </Link>

        <div className="flex items-center justify-end gap-1">
          {features.wishlist && (
            <Link href={href.wishlist(locale)} className={`${iconLink} ${features.shop ? 'hidden sm:flex' : ''}`} aria-label={t('wishlist.title')}>
              <HeartIcon />
            </Link>
          )}
          {features.accounts && (
            <Link href={href.account(locale)} className={`${iconLink} hidden sm:flex`} aria-label={t('nav.account')}>
              <UserIcon />
            </Link>
          )}
          {features.shop && (
            <Link href={href.bag(locale)} className={iconLink} aria-label={`${t('nav.bag')}${count ? ` (${count})` : ''}`}>
              <BagIcon />
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-gold)] px-1 font-sans text-[0.6rem] text-white">
                  {count}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      <nav className="mx-auto hidden w-[min(92%,72rem)] justify-around pb-3 pt-7 md:flex" aria-label="Main">
        {links.map((l) =>
          l.external ? (
            <a key={l.id} href={l.href} target="_blank" rel="noreferrer" className="nav-link py-1">
              {l.text}
            </a>
          ) : (
            <Link key={l.id} href={l.href} className={`nav-link py-1 ${isActive(l) ? 'text-[var(--color-gold)]' : ''}`} aria-current={isActive(l) ? 'page' : undefined}>
              {l.text}
            </Link>
          ),
        )}
      </nav>

      {open && (
        <nav id="mobile-menu" className="fixed inset-x-0 bottom-0 top-[var(--header-h,8.5rem)] overflow-y-auto bg-[var(--color-ivory)] px-5 pb-10 pt-6 md:hidden" aria-label="Main">
          {links.map((l) =>
            l.external ? (
              <a key={l.id} href={l.href} target="_blank" rel="noreferrer" className="font-display block py-2 text-[1.75rem]">
                {l.text}
              </a>
            ) : (
              <Link key={l.id} href={l.href} className="font-display block py-2 text-[1.75rem]" aria-current={isActive(l) ? 'page' : undefined}>
                {l.text}
              </Link>
            ),
          )}
          {(features.wishlist || features.accounts) && (
            <div className="mt-6 flex flex-col gap-3 border-t border-[var(--color-line)] pt-6 font-sans text-sm">
              {features.wishlist && (
                <Link href={href.wishlist(locale)} className="flex items-center gap-3 py-1">
                  <HeartIcon /> {t('wishlist.title')}
                </Link>
              )}
              {features.accounts && (
                <Link href={href.account(locale)} className="flex items-center gap-3 py-1">
                  <UserIcon /> {t('nav.account')}
                </Link>
              )}
            </div>
          )}
          <LanguageSwitch className="mt-8 block font-sans text-sm" />
          <Link href={`${href.contact(locale)}#appointment`} className="btn btn-dark mt-8 w-full">
            {t('nav.book')}
          </Link>
        </nav>
      )}
    </header>
  );
}
