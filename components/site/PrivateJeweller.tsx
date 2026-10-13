import type { HeaderLogo } from '@/lib/types';

const COLOUR: Record<HeaderLogo, React.CSSProperties> = {
  ink: { color: '#38302A' },
  black: { color: '#000000' },
  // The same soft gold as the 58 DIAMONDS wordmark.
  'brown-gold': {
    backgroundImage: 'linear-gradient(135deg, #8C6A3A 0%, #B99A66 28%, #9C7B48 50%, #BFA06C 72%, #8E6C3C 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  },
};

/** The PRIVATE JEWELLER line under the logo: in the wordmark's lettering and colour (Admin > Homepage). */
export function PrivateJeweller({ logo, className = '' }: { logo: HeaderLogo; className?: string }) {
  return (
    <span className={`block whitespace-nowrap text-center font-[family-name:var(--font-wordmark)] uppercase tracking-[0.26em] ${className}`} style={COLOUR[logo] ?? COLOUR.ink}>
      Private jeweller
    </span>
  );
}
