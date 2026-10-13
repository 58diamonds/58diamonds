import { getSettings } from '@/lib/data';

export const revalidate = 300;

const LOGOS: Record<string, string> = {
  ink: '/brand/logo-ink.svg',
  black: '/brand/logo-black.svg',
  'brown-gold': '/brand/logo-brown-gold.svg',
};

/** What the public sees while the site is hidden (Admin > Settings): only the logo. */
export default async function Holding() {
  const settings = await getSettings();
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--color-ivory)] p-8">
      <h1 className="sr-only">58 Diamonds</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGOS[settings.header_logo] ?? LOGOS['brown-gold']} alt="58 Diamonds" className="h-auto w-56 sm:w-72" />
    </main>
  );
}
