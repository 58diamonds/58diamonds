import type { HeaderLogo } from '@/lib/types';

const COLOUR: Record<HeaderLogo, React.CSSProperties> = {
  ink: { color: '#38302A' },
  black: { color: '#000000' },
  // The same gold sweep as the logo.
  'brown-gold': {
    backgroundImage: 'linear-gradient(135deg, #9A7743 0%, #E9D29C 28%, #B8925A 50%, #F2DFAE 72%, #A07C46 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  },
};

/** The PRIVATE JEWELLER line under the logo, in the logo's colour (Admin > Homepage). */
export function PrivateJeweller({ logo, className = '' }: { logo: HeaderLogo; className?: string }) {
  return (
    <span className={`block whitespace-nowrap text-center font-sans uppercase tracking-[0.42em] ${className}`} style={COLOUR[logo] ?? COLOUR.ink}>
      Private jeweller
    </span>
  );
}
