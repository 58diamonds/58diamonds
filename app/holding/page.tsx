import { PrivateJeweller } from '@/components/site/PrivateJeweller';
import { getSettings } from '@/lib/data';

export const revalidate = 300;

const LOGOS: Record<string, string> = {
  ink: '/brand/logo-ink.svg?v=3',
  black: '/brand/logo-black.svg?v=3',
  'brown-gold': '/brand/logo-brown-gold.svg?v=3',
};

/** What the public sees while the site is hidden (Admin > Settings): only the logo. */
export default async function Holding() {
  const settings = await getSettings();
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--color-ivory)] p-8">
      <h1 className="sr-only">58 Diamonds</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div>
        <img src={LOGOS[settings.header_logo] ?? LOGOS['brown-gold']} alt="58 Diamonds" className="h-auto w-[min(24rem,calc(100vw-4rem))] sm:w-96" />
        {settings.private_jeweller === true && <PrivateJeweller logo={settings.header_logo} className="mt-5 pl-[0.26em] text-[min(1.1rem,4vw)] sm:text-[0.95rem]" />}
      </div>
    </main>
  );
}
