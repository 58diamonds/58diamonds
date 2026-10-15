import { PrivateJeweller } from '@/components/site/PrivateJeweller';
import { getSettings } from '@/lib/data';

export const revalidate = 300;

/** What the public sees while the site is hidden (Admin > Settings): the logo and a handwritten "Coming soon...". */
export default async function Holding() {
  const settings = await getSettings();
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--color-ivory)] p-8">
      <h1 className="sr-only">58 Diamonds</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div>
        <img src="/brand/logo-brown-gold.svg?v=3" alt="58 Diamonds" className="h-auto w-[min(24rem,calc(100vw-4rem))] sm:w-96" />
        {settings.private_jeweller === true && <PrivateJeweller logo="brown-gold" className="mt-5 pl-[0.26em] text-[0.85rem] sm:text-[0.85rem]" />}
        <p
          className="mt-10 text-center font-[family-name:var(--font-script)] text-[2.6rem] leading-none sm:mt-12 sm:text-[3.2rem]"
          style={{
            backgroundImage: 'linear-gradient(135deg, #8C6A3A 0%, #B99A66 28%, #9C7B48 50%, #BFA06C 72%, #8E6C3C 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            paddingBottom: '0.15em',
          }}
        >
          Coming soon...
        </p>
      </div>
    </main>
  );
}
