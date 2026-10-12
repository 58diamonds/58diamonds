import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/site/JsonLd';
import { EventCard } from '@/components/site/EventCard';
import { InstagramGrid } from '@/components/site/InstagramGrid';
import { NewsletterForm } from '@/components/site/NewsletterForm';
import { Photo } from '@/components/site/Photo';
import { PieceCard } from '@/components/site/PieceCard';
import { SITE_URL } from '@/lib/config';
import { getEvents, getFeatures, getInstagramPosts, getPages, getPieces } from '@/lib/data';
import { splitEvents } from '@/lib/format';
import { tr } from '@/lib/i18n';
import { pieceView, wornPhoto } from '@/lib/piece-view';
import { href } from '@/lib/routes';
import { alternates, site } from '@/lib/site';
import type { HomeBlock } from '@/lib/types';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, t } = await site(params);
  return { title: { absolute: t('seo.home_title') }, description: t('seo.home_description'), alternates: alternates(locale, '') };
}

export default async function Home({ params }: Props) {
  const { locale, t, settings, sections } = await site(params);
  const [pieces, events, instagram, features, pages] = await Promise.all([
    getPieces(),
    getEvents(),
    getInstagramPosts(),
    getFeatures(),
    getPages(),
  ]);
  // Full rows only (4 per row on large screens), so the grid never ends with a lone piece.
  const picked = pieces.filter((p) => p.featured).slice(0, 8);
  const featured = picked
    .slice(0, picked.length >= 4 ? picked.length - (picked.length % 4) : picked.length)
    .map((p) => pieceView(p, sections, settings, t, locale));
  const upcoming = splitEvents(events).upcoming.slice(0, 3);
  const about = pages.find((p) => p.slug === 'about');
  const tiles = (settings.home_tiles ?? []).filter((x) => x.image_url || x.piece_id).slice(0, 6);
  const paragraphs = (text: string) => text.split(/\n\s*\n/).map((p, i) => <p key={i} className="mt-4 first:mt-0">{p}</p>);
  const band = 'border-t border-[var(--color-line)] py-16 sm:py-24';

  const blocks: Record<HomeBlock, React.ReactNode> = {
    tiles: tiles.length > 0 && (
      <section key="tiles" id="pieces" className="mx-auto max-w-[85rem] scroll-mt-28 px-4 sm:px-8">
        <h2 className="font-display py-14 text-center text-[clamp(1.9rem,3.4vw,2.9rem)] leading-tight [text-wrap:balance] sm:py-20">
          {t('home.tiles_title').split('\n').map((l, i) => (
            <span key={i} className="block">{l}</span>
          ))}
        </h2>
        <div className="grid grid-cols-2 gap-3 pb-16 sm:grid-cols-3 sm:gap-4 sm:pb-24 lg:grid-cols-6">
          {tiles.map((tile, i) => {
            // The piece gives the name; a click opens its section of the collection.
            const piece = tile.piece_id ? pieces.find((p) => p.id === tile.piece_id) : undefined;
            const section = sections.find((s) => s.id === (piece?.section_id ?? tile.section_id));
            const name = piece ? tr(piece.title, locale) : section ? tr(section.name, locale) : '';
            const photo = tile.image_url ?? (piece && (wornPhoto(piece.piece_images) ?? piece.piece_images[0])?.url) ?? null;
            if (!photo) return null;
            return (
              <Link key={i} href={href.shop(locale, section?.slug)} className="group flex min-w-0 flex-col gap-2.5">
                <span className="block aspect-square overflow-hidden bg-white">
                  <Photo src={photo} alt={name} className="h-full w-full transition duration-700 group-hover:scale-[1.04]" />
                </span>
                <span className="label text-center group-hover:text-[var(--color-gold)]">{name}</span>
              </Link>
            );
          })}
        </div>
      </section>
    ),

    house: (
      <section key="house" className={`${band} bg-[var(--color-pearl)]`}>
        <div className="mx-auto max-w-[85rem] px-4 sm:px-8">
          <p className="eyebrow">{t('home.house_eyebrow')}</p>
          <h2 className="font-display mt-4 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight [text-wrap:balance]">{t('home.house_title')}</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-14">
            {([1, 2, 3] as const).map((n) => (
              <div key={n}>
                <h3 className="font-display text-[1.4rem] font-medium">{t(`home.house${n}_title`)}</h3>
                <p className="mt-2 text-[var(--color-stone)]">{t(`home.house${n}_text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    featured: featured.length > 0 && (
      <section key="featured" className={band}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <p className="eyebrow">{t('home.featured_eyebrow')}</p>
            <h2 className="font-display mt-3 text-4xl sm:text-5xl">{t('home.featured_title')}</h2>
          </div>
          <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
            {featured.map((p) => (
              <PieceCard key={p.id} piece={p} />
            ))}
          </div>
          <div className="mt-14 text-center">
            <Link href={href.shop(locale)} className="btn btn-light">
              {t('home.featured_link')}
            </Link>
          </div>
        </div>
      </section>
    ),

    sections: sections.length > 0 && (
      <section key="sections" className={band}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 md:grid-cols-4">
          {sections.map((s) => (
            <Link key={s.id} href={href.shop(locale, s.slug)} className="group flex flex-col gap-3">
              <span className="block aspect-square overflow-hidden bg-white">
                <Photo src={s.cover_url} alt={tr(s.name, locale)} className="h-full w-full transition duration-700 group-hover:scale-[1.04]" />
              </span>
              <span className="font-display text-center text-2xl group-hover:text-[var(--color-gold)]">{tr(s.name, locale)}</span>
            </Link>
          ))}
        </div>
      </section>
    ),

    story: (
      <section key="story" className={band}>
        <div className="mx-auto grid max-w-[85rem] items-center gap-10 px-4 sm:px-8 md:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] md:gap-20">
          <Photo src={settings.about_image_url} alt={t('home.about_title')} className="mx-auto aspect-[9/14] w-full max-w-[19rem] md:max-w-none" />
          <div className="max-w-[40rem]">
            <p className="eyebrow">{t('home.about_eyebrow')}</p>
            <h2 className="font-display mt-4 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight [text-wrap:balance]">{t('home.about_title')}</h2>
            <div className="mt-6">{paragraphs(t('home.about_text'))}</div>
            {about && (
              <Link href={href.page(locale, about.slug)} className="btn btn-light mt-8">
                {t('home.about_link')}
              </Link>
            )}
          </div>
        </div>
      </section>
    ),

    events: features.events && upcoming.length > 0 && (
      <section key="events" className={band}>
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-center text-4xl sm:text-5xl">{t('home.events_title')}</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} locale={locale} />
            ))}
          </div>
        </div>
      </section>
    ),

    instagram: instagram.length > 0 && (
      <section key="instagram" className={band}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl">{t('home.instagram_title')}</h2>
            <a href={`https://www.instagram.com/${settings.instagram_handle}/`} target="_blank" rel="noreferrer" className="eyebrow hover:text-[var(--color-ink)]">
              @{settings.instagram_handle}
            </a>
          </div>
          <InstagramGrid posts={instagram.slice(0, 8)} />
        </div>
      </section>
    ),

    newsletter: features.newsletter && (
      <section key="newsletter" className={`${band} text-center`}>
        <div className="mx-auto max-w-xl px-5">
          <p className="eyebrow">{t('newsletter.title')}</p>
          <p className="font-display mt-4 text-3xl leading-snug">{t('newsletter.text')}</p>
          <div className="mx-auto mt-8 max-w-md text-left">
            <NewsletterForm />
          </div>
        </div>
      </section>
    ),

    contact: (
      <section key="contact" className={`${band} bg-[var(--color-pearl)] text-center`}>
        <div className="mx-auto max-w-[85rem] px-4 sm:px-8">
          <p className="eyebrow">{t('home.contact_eyebrow')}</p>
          <h2 className="font-display mt-4 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight">{t('home.contact_title')}</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {settings.company_address || settings.address ? (
              <div>
                <p className="label">{t('home.contact_showroom')}</p>
                <p className="mt-2 whitespace-pre-line text-[1.3rem]">{(settings.address || settings.company_address || '').split('\n').filter((l) => !/^belgi/i.test(l.trim())).join('\n')}</p>
              </div>
            ) : null}
            <div>
              <p className="label">Instagram</p>
              <a href={`https://www.instagram.com/${settings.instagram_handle}/`} target="_blank" rel="noreferrer" className="mt-2 block text-[1.3rem] hover:text-[var(--color-gold)]">
                @{settings.instagram_handle}
              </a>
            </div>
            <div>
              <p className="label">{t('home.contact_visits')}</p>
              <p className="mt-2 text-[1.3rem]">{t('footer.appointment')}</p>
            </div>
          </div>
          <Link href={`${href.contact(locale)}#appointment`} className="btn btn-light mt-10">
            {t('nav.book')}
          </Link>
        </div>
      </section>
    ),
  };

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'JewelryStore',
          name: settings.company_name || '58 Diamonds',
          url: `${SITE_URL}/${locale}`,
          logo: `${SITE_URL}/brand/logo-gold.svg`,
          image: absolute(settings.og_image_url || settings.hero_image_url),
          description: t('seo.home_description'),
          email: settings.email || undefined,
          telephone: settings.phone || undefined,
          address: postalAddress(settings.company_address) ?? (settings.address || undefined),
          vatID: settings.vat_number || undefined,
          sameAs: settings.instagram_handle ? [`https://www.instagram.com/${settings.instagram_handle}/`] : undefined,
        }}
      />
      <Hero t={t} image={settings.hero_image_url} />
      {/* The last band meets the footer, without the gap other pages keep. */}
      <div className="-mb-20">{settings.home_blocks.map((b) => blocks[b] ?? null)}</div>
    </>
  );
}

/** "Street 1\n2018 Antwerp\nBelgium" as schema.org PostalAddress. */
function postalAddress(text: string | null) {
  if (!text) return undefined;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const city = text.match(/(\d{4,5})\s+([^\n,]+)/);
  return {
    '@type': 'PostalAddress',
    streetAddress: lines[0],
    postalCode: city?.[1],
    addressLocality: city?.[2].replace(/\s*-\s*.*$/, '').trim(),
    addressCountry: /belgi/i.test(text) ? 'BE' : undefined,
  };
}

/** Structured data needs full addresses; demo and older photos may be site-relative. */
function absolute(url: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith('/') ? `${SITE_URL}${url}` : url;
}

function Hero({ t, image }: { t: Awaited<ReturnType<typeof site>>['t']; image: string | null }) {
  return (
    <section className="relative bg-[var(--color-pearl)]">
      <h1 className="sr-only">58 Diamonds by Farah. {t('home.hero_subtitle')}</h1>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="hero-photo" fetchPriority="high" />
      )}
      <a href="#pieces" className="label absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 !text-[var(--color-ink)]">
        {t('home.scroll')}
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M5 9l7 7 7-7" />
        </svg>
      </a>
    </section>
  );
}
