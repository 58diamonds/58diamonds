import type { HeaderLogo } from '@/lib/types';

/** The PRIVATE JEWELLER line under the logo, set like the menu (Admin > Homepage). */
export function PrivateJeweller({ className = '' }: { logo?: HeaderLogo; className?: string }) {
  return (
    <span className={`block whitespace-nowrap text-center font-sans uppercase tracking-[0.26em] text-[var(--color-ink)] ${className}`}>
      Private jeweller
    </span>
  );
}
