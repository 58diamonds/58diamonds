import { HoldingLines } from '@/components/site/HoldingLines';
import { PrivateJeweller } from '@/components/site/PrivateJeweller';
import { getSettings } from '@/lib/data';

export const revalidate = 300;

/** What the public sees while the site is hidden (Admin > Settings): a handwritten "Coming soon...", the logo, and a few words from Farah. */
export default async function Holding() {
  const settings = await getSettings();
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--color-ivory)] p-8">
      <h1 className="sr-only">58 Diamonds</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div>
        <ComingSoon />
        <img src="/brand/logo-brown-gold.svg?v=3" alt="58 Diamonds" className="h-auto w-[min(24rem,calc(100vw-4rem))] sm:w-96" />
        {settings.private_jeweller === true && <PrivateJeweller logo="brown-gold" className="mt-5 pl-[0.26em] text-[0.85rem] sm:text-[0.85rem]" />}
        <HoldingLines />
      </div>
    </main>
  );
}

const GOLD = 'linear-gradient(135deg, #8C6A3A 0%, #B99A66 28%, #9C7B48 50%, #BFA06C 72%, #8E6C3C 100%)';
// Each letter's nudge up or down (em) and tilt (deg): a hand-written line, not a typeset one.
const JITTER = [
  [0.02, -4], [-0.05, 3], [0.04, -2], [-0.03, 5], [0.05, -3], [-0.04, 2], [0, 0], [0.03, 4], [-0.05, -3],
  [0.04, 2], [-0.02, -5], [0.05, 3], [-0.04, -2], [0.03, 4],
];

/** "Coming soon..." by hand: letters a little out of line, the line climbing from lower left to upper right. */
function ComingSoon() {
  const text = 'Coming soon...';
  const last = text.length - 1;
  return (
    <p aria-label={text} className="mb-10 flex justify-center font-[family-name:var(--font-script)] text-[1.9rem] leading-none sm:mb-12 sm:text-[2.4rem]">
      {[...text].map((ch, i) => {
        const [dy, rot] = JITTER[i % JITTER.length];
        // Climbs 0.55em over the line, first letter lowest.
        const rise = 0.275 - (0.55 * i) / last;
        return (
          <span
            key={i}
            aria-hidden
            className="inline-block whitespace-pre"
            style={{
              transform: `translateY(${(rise + dy).toFixed(3)}em) rotate(${rot}deg)`,
              backgroundImage: GOLD,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              padding: '0.2em 0.02em 0.35em',
            }}
          >
            {ch}
          </span>
        );
      })}
    </p>
  );
}
