'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { activeFilterCount, shopQueryString, type ShopQuery, type SortKey } from '@/lib/shop';
import { ChevronIcon, CloseIcon } from './icons';
import { useSite } from './SiteProvider';

type Option = { slug: string; label: string };

/** Filter and sort bar. Every choice lives in the address, so a filtered page can be shared or bookmarked. */
export function ShopControls({
  query,
  metals,
  stones,
  sizes,
  count,
  currency,
}: {
  query: ShopQuery;
  metals: Option[];
  stones: Option[];
  sizes: Option[];
  count: number;
  currency: string;
}) {
  const { t } = useSite();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(query);
  const [pending, startTransition] = useTransition();

  useEffect(() => setDraft(query), [query]);

  const go = (q: ShopQuery) => startTransition(() => router.push(`${pathname}${shopQueryString(q)}`, { scroll: false }));
  const toggle = (key: 'metal' | 'stone' | 'size', slug: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(slug) ? d[key].filter((s) => s !== slug) : [...d[key], slug] }));

  const active = activeFilterCount(query);
  const sorts: { key: SortKey; label: string }[] = [
    { key: 'new', label: t('shop.sort_new') },
    { key: 'old', label: t('shop.sort_old') },
    { key: 'price-asc', label: t('shop.sort_price_asc') },
    { key: 'price-desc', label: t('shop.sort_price_desc') },
  ];

  return (
    <div className={`mt-8 border-y border-[var(--color-line)] ${pending ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between gap-4 py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="shop-filters" className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.22em]">
          {t('shop.filter')}
          {active > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-ink)] px-1 text-[0.62rem] text-[var(--color-ivory)]">{active}</span>}
          <ChevronIcon className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        <p className="hidden text-[0.72rem] uppercase tracking-[0.22em] text-[var(--color-stone)] sm:block" aria-live="polite">
          {count === 1 ? t('shop.count_one') : t('shop.count', { n: count })}
        </p>
        <label className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.22em]">
          <span className="text-[var(--color-stone)]">{t('shop.sort')}</span>
          <select
            value={query.sort ?? ''}
            onChange={(e) => go({ ...query, sort: (e.target.value || null) as SortKey | null })}
            className="cursor-pointer appearance-none bg-transparent pr-1 uppercase tracking-[0.18em] outline-none"
          >
            <option value="">{t('shop.sort_default')}</option>
            {sorts.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {active > 0 && !open && (
        <div className="flex flex-wrap gap-2 pb-3">
          {[...query.metal.map((s) => ['metal', s] as const), ...query.stone.map((s) => ['stone', s] as const), ...query.size.map((s) => ['size', s] as const)].map(([k, s]) => (
            <button key={`${k}${s}`} type="button" className="chip" onClick={() => go({ ...query, [k]: query[k].filter((x) => x !== s) })}>
              {k === 'size' ? `${t('shop.size')} ${s}` : ([...metals, ...stones].find((o) => o.slug === s)?.label ?? s)} <CloseIcon className="h-3 w-3" />
            </button>
          ))}
          {(query.min != null || query.max != null) && (
            <button type="button" className="chip" onClick={() => go({ ...query, min: null, max: null })}>
              {query.min ?? 0} - {query.max ?? '∞'} {currency} <CloseIcon className="h-3 w-3" />
            </button>
          )}
          {query.available && (
            <button type="button" className="chip" onClick={() => go({ ...query, available: false })}>
              {t('shop.available')} <CloseIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {open && (
        <form
          id="shop-filters"
          className="grid gap-8 border-t border-[var(--color-line)] py-8 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            go(draft);
            setOpen(false);
          }}
        >
          {metals.length > 0 && (
            <fieldset>
              <legend className="eyebrow mb-3">{t('shop.metal')}</legend>
              <div className="flex flex-wrap gap-2">
                {metals.map((m) => (
                  <button key={m.slug} type="button" className="chip" aria-pressed={draft.metal.includes(m.slug)} onClick={() => toggle('metal', m.slug)}>
                    {m.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {stones.length > 0 && (
            <fieldset>
              <legend className="eyebrow mb-3">{t('shop.stone')}</legend>
              <div className="flex flex-wrap gap-2">
                {stones.map((s) => (
                  <button key={s.slug} type="button" className="chip" aria-pressed={draft.stone.includes(s.slug)} onClick={() => toggle('stone', s.slug)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {sizes.length > 0 && (
            <fieldset>
              <legend className="eyebrow mb-3">{t('shop.size')}</legend>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s.slug} type="button" className="chip" aria-pressed={draft.size.includes(s.slug)} onClick={() => toggle('size', s.slug)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset>
            <legend className="eyebrow mb-3">
              {t('shop.price')} ({currency})
            </legend>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder={t('shop.price_min')}
                aria-label={t('shop.price_min')}
                value={draft.min ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) }))}
                className="field"
              />
              <span aria-hidden="true">-</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder={t('shop.price_max')}
                aria-label={t('shop.price_max')}
                value={draft.max ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) }))}
                className="field"
              />
            </div>
          </fieldset>
          <fieldset>
            <legend className="eyebrow mb-3">{t('shop.available')}</legend>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={draft.available}
                onChange={(e) => setDraft((d) => ({ ...d, available: e.target.checked }))}
                className="h-4 w-4 accent-[var(--color-ink)]"
              />
              <span>{t('shop.available')}</span>
            </label>
          </fieldset>
          <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
            <button type="submit" className="btn btn-dark">
              {t('shop.apply')}
            </button>
            <button
              type="button"
              className="btn btn-light"
              onClick={() => {
                const cleared = { ...query, metal: [], stone: [], size: [], min: null, max: null, available: false };
                setDraft(cleared);
                go(cleared);
                setOpen(false);
              }}
            >
              {t('shop.clear')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
