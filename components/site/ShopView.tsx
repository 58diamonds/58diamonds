import Link from 'next/link';
import { getAttributes, getPieces } from '@/lib/data';
import { tr, type Locale } from '@/lib/i18n';
import { pieceView } from '@/lib/piece-view';
import { href } from '@/lib/routes';
import { filterPieces, parseShopQuery, shopQueryString } from '@/lib/shop';
import type { T } from '@/lib/t';
import type { Section, Settings } from '@/lib/types';
import { PieceCard } from './PieceCard';
import { ShopControls } from './ShopControls';

/** The shop: section tabs, filters, sorting and the grid. Shared by /shop and /shop/[section]. */
export async function ShopView({
  locale,
  t,
  settings,
  sections,
  section,
  searchParams,
}: {
  locale: Locale;
  t: T;
  settings: Settings;
  sections: Section[];
  section: Section | null;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [pieces, attributes] = await Promise.all([getPieces(), getAttributes()]);
  const query = parseShopQuery(searchParams);
  const inSection = section ? pieces.filter((p) => p.section_id === section.id) : pieces.filter((p) => !p.section_id || sections.some((s) => s.id === p.section_id));
  const attrs = {
    metal: new Map(attributes.filter((a) => a.kind === 'metal').map((a) => [a.id, a.slug])),
    stone: new Map(attributes.filter((a) => a.kind === 'stone').map((a) => [a.id, a.slug])),
  };
  const shown = filterPieces(inSection, query, attrs, (p) => sections.find((s) => s.id === p.section_id));
  const views = shown.map((p) => pieceView(p, sections, settings, t, locale));

  // Only offer filter values that exist in this section.
  const used = (kind: 'metal' | 'stone') =>
    attributes
      .filter((a) => a.kind === kind && inSection.some((p) => (kind === 'metal' ? p.metal_id : p.stone_id) === a.id))
      .map((a) => ({ slug: a.slug, label: tr(a.label, locale) }));

  const qs = shopQueryString({ ...query, sort: query.sort });
  const title = section ? tr(section.name, locale) : t('shop.title');
  const intro = section ? tr(section.description, locale) : t('shop.intro');

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-14 sm:pt-20">
      <header className="text-center">
        <p className="eyebrow">{t('shop.eyebrow')}</p>
        <h1 className="font-display mt-3 text-5xl sm:text-6xl">{title}</h1>
        {intro && <p className="mx-auto mt-5 max-w-xl text-[var(--color-stone)]">{intro}</p>}
      </header>

      <nav aria-label={t('shop.title')} className="no-scrollbar -mx-5 mt-12 flex gap-2 overflow-x-auto px-5 sm:justify-center">
        <Link href={`${href.shop(locale)}${qs}`} className="chip shrink-0" aria-current={!section ? 'page' : undefined}>
          {t('shop.all')}
        </Link>
        {sections.map((s) => (
          <Link key={s.id} href={`${href.shop(locale, s.slug)}${qs}`} className="chip shrink-0" aria-current={section?.id === s.id ? 'page' : undefined}>
            {tr(s.name, locale)}
          </Link>
        ))}
      </nav>

      <ShopControls
        query={query}
        metals={used('metal')}
        stones={used('stone')}
        count={views.length}
        currency={settings.currency}
      />

      {views.length === 0 ? (
        <p className="py-24 text-center text-[var(--color-stone)]">{t('shop.empty')}</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
          {views.map((p, i) => (
            <PieceCard key={p.id} piece={p} eager={i < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
