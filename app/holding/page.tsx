import { PrivateJeweller } from '@/components/site/PrivateJeweller';
import { getSettings } from '@/lib/data';

export const revalidate = 300;

/** What the public sees while the site is hidden (Admin > Settings): only the logo. */
export default async function Holding() {
  const settings = await getSettings();
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--color-ivory)] p-8">
      <h1 className="sr-only">58 Diamonds</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div>
        <img src="/brand/logo-brown-gold.svg?v=3" alt="58 Diamonds" className="h-auto w-[min(24rem,calc(100vw-4rem))] sm:w-96" />
        {settings.private_jeweller === true && <PrivateJeweller logo="brown-gold" className="mt-5 pl-[0.26em] text-[0.85rem] sm:text-[0.85rem]" />}
      </div>
    </main>
  );
}
