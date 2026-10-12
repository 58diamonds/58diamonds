type P = { className?: string };
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const BagIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <path d="M5 8h14l-1 12H6L5 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const HeartIcon = ({ className = 'h-5 w-5', filled = false }: P & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);

export const UserIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5" />
  </svg>
);

export const CloseIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const ChevronIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const ArrowIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

export function WhatsAppIcon({ className = 'h-6 w-6' }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.44 9.44 0 0 1-1.45-5.03C2.56 6.83 6.8 2.6 12.05 2.6a9.4 9.4 0 0 1 6.69 2.78 9.4 9.4 0 0 1 2.77 6.69c0 5.21-4.25 9.44-9.47 9.44zm8.06-17.5A11.33 11.33 0 0 0 12.04.66C5.75.66.64 5.77.63 12.06c0 2.01.53 3.97 1.52 5.7L.54 23.66l6.04-1.58a11.4 11.4 0 0 0 5.45 1.39h.01c6.28 0 11.4-5.11 11.4-11.4 0-3.05-1.19-5.91-3.34-8.07z" />
    </svg>
  );
}
