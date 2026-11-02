import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BuyBox } from '@/components/site/BuyBox';
import { PieceOptions, PiecePrice } from '@/components/site/PieceOptions';
import { Gallery } from '@/components/site/Gallery';
import { JsonLd } from '@/components/site/JsonLd';
import { PieceCard } from '@/components/site/PieceCard';
import { SITE_URL } from '@/lib/config';
import { getAttributes, getPiece, getPieces } from '@/lib/data';
import { paragraphs } from '@/lib/format';
import { tr } from '@/lib/i18n';
import { pieceView } from '@/lib/piece-view';
import { href } from '@/lib/routes';
import { pieceStock, priceVisible } from '@/lib/shop';
import { pieceSpecs } from '@/lib/specs';
import { variantViews } from '@/lib/variant';
import { alternates, site } from '@/lib/site';

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await site(params);
  const piece = await getPiece((await params).slug);
  if (!piece) return {};
  const image = piece.piece_images[0]?.url;
  const title = tr(piece.seo_title, locale) || tr(piece.title, locale);
  const description = tr(piece.seo_description, locale) || tr(piece.description, locale).slice(0, 160) || undefined;
  return {
    title,
    description,
    alternates: alternates(locale, `/piece/${piece.slug}`),
    openGraph: { title, description, images: image ? [image] : undefined },
  };
}

export default async function PiecePage({ params }: Props) {
  const { locale, t, settings, sections } = await site(params);
  const { slug } = await params;
  const [piece, all, attributes] = await Promise.all([getPiece(slug), getPieces(), getAttributes()]);
  if (!piece) notFound();

  const section = sections.find((s) => s.id === piece.section_id) ?? null;
  const view = pieceView(piece, sections, settings, t, locale);
  const title = view.title;
  const description = tr(piece.description, locale);
  const details = tr(piece.details, locale);
  const metal = attributes.find((a) => a.id === piece.metal_id);
  const specs = pieceSpecs(piece, attributes, locale, t);
  const related = all
    .filter((p) => p.id !== piece.id && p.section_id === piece.section_id)
    .slice(0, 4)
    .map((p) => pieceView(p, sections, settings, t, locale));

  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: description || undefined,
    image: piece.piece_images.map((i) => new URL(i.url, SITE_URL).toString()),
    brand: { '@type': 'Brand', name: '58 Diamonds' },
    material: metal ? tr(metal.label, locale) : undefined,
    url: `${SITE_URL}${href.piece(locale, piece.slug)}`,
    ...(priceVisible(piece, section)
      ? {
          offers: {
            '@type': 'Offer',
            price: Number(piece.price).toFixed(2),
            priceCurrency: settings.currency,
            availability: pieceStock(piece) > 0 && piece.for_sale ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
            url: `${SITE_URL}${href.piece(locale, piece.slug)}`,
          },
        }
      : {}),
  };

  return (
    <div className="px-5 pb-10 pt-10 sm:pt-14">
      <JsonLd data={product} />
      <div className="mx-auto max-w-6xl">
        <nav className="text-[0.7rem] uppercase tracking-[0.22em] text-[var(--color-stone)]" aria-label="Breadcrumb">
          <Link href={href.shop(locale)} className="hover:text-[var(--color-ink)]">
            {t('shop.title')}
          </Link>
          {section && (
            <>
              <span className="mx-2">/</span>
              <Link href={href.shop(locale, section.slug)} className="hover:text-[var(--color-ink)]">
                {tr(section.name, locale)}
              </Link>
            </>
          )}
        </nav>

        <PieceOptions options={variantViews(piece.piece_variants, attributes, locale)}>
        <div className="mt-8 grid gap-12 md:grid-cols-2 md:gap-16">
          <Gallery
            title={title}
            images={piece.piece_images.map((i) => {
              const colour = i.metal_id ? attributes.find((a) => a.id === i.metal_id) : null;
              return { id: i.id, url: i.url, alt: tr(i.alt, locale) || title, metal: colour ? tr(colour.label, locale) : null };
            })}
          />

          <div className="md:pt-6">
            <h1 className="font-display text-5xl leading-tight">{title}</h1>
            <PiecePrice
              text={view.priceText}
              basePrice={piece.price == null ? null : Number(piece.price)}
              showsPrice={view.status === 'available'}
              className={`mt-4 text-[0.78rem] uppercase tracking-[0.24em] ${view.status === 'available' ? 'text-[var(--color-ink)]' : 'text-[var(--color-gold)]'}`}
            />
            {description && (
              <div className="prose-site mt-8 text-lg leading-relaxed text-[var(--color-stone)]">
                {paragraphs(description).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}

            <BuyBox
              pieceId={piece.id}
              title={title}
              purchasable={view.purchasable}
              stock={pieceStock(piece)}
            />

            {(details || specs.metal || specs.weight || specs.stones) && (
              <div className="mt-12">
                <h2 className="eyebrow mb-3">{t('piece.details')}</h2>
                <ul className="border-t border-[var(--color-line)] text-sm">
                  {specs.metal && <li className="border-b border-[var(--color-line)] py-3">{t('shop.metal')}: {specs.metal}</li>}
                  {specs.weight && <li className="border-b border-[var(--color-line)] py-3">{t('piece.weight')}: {specs.weight}</li>}
                  {specs.stones && <li className="border-b border-[var(--color-line)] py-3">{t('shop.stone')}: {specs.stones}</li>}
                  {details
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .map((line, i) => (
                      <li key={i} className="border-b border-[var(--color-line)] py-3">
                        {line}
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {view.purchasable && <p className="mt-6 text-sm text-[var(--color-stone)]">{t('piece.shipping_note')}</p>}
          </div>
        </div>
        </PieceOptions>

        {related.length > 0 && (
          <section className="mt-28">
            <h2 className="font-display text-center text-4xl">{t('piece.related')}</h2>
            <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
              {related.map((p) => (
                <PieceCard key={p.id} piece={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
