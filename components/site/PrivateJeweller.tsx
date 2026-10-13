/** The PRIVATE JEWELLER line under the logo, in the same letters and colour as the menu (Admin > Homepage). */
export function PrivateJeweller({ className = '' }: { className?: string }) {
  return (
    <span className={`block whitespace-nowrap text-center font-sans uppercase tracking-[0.26em] text-[var(--color-ink)] ${className}`}>
      Private jeweller
    </span>
  );
}
