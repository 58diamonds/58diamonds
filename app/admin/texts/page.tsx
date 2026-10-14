'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Button, Help, Loading, PageTitle, TranslateButton, inputCls } from '@/components/admin/ui';
import { publish } from '@/lib/admin-client';
import { LOCALES, LOCALE_NAMES, type L10n } from '@/lib/i18n';
import { getAdminDb } from '@/lib/supabase';
import { TEXTS, type TextKey } from '@/lib/texts';
import { SECTION_LABELS, orderSections, textSections } from '@/lib/text-sections';
import { askConfirm } from '@/components/admin/confirm';

export default function TextsAdmin() {
  return (
    <Suspense fallback={<Loading />}>
      <Texts />
    </Suspense>
  );
}

/**
 * Every fixed text of the site, in the three languages. Sections follow the
 * site from top to bottom (the arrows change that order, here only), and the
 * texts inside a section follow the page. A change, typed or translated, is
 * kept aside until Save; Cancel drops it. "Original" puts the starting
 * wording back.
 */
function Texts() {
  const db = getAdminDb();
  const all = useMemo(() => textSections(), []);
  const sectionOf = useMemo(() => Object.fromEntries(all.flatMap((s) => s.keys.map((k) => [k, s.name]))) as Record<TextKey, string>, [all]);
  const [order, setOrder] = useState<string[] | null>(null);
  const [open, setOpen] = useState<string | null>(useSearchParams().get('group'));
  const [saved, setSaved] = useState<Record<string, L10n> | null>(null);
  const [draft, setDraft] = useState<Record<string, L10n>>({});
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    db.from('site_texts')
      .select('key, value')
      .then(({ data }) => setSaved(Object.fromEntries((data ?? []).map((r: { key: string; value: L10n }) => [r.key, r.value]))));
    db.from('app_settings')
      .select('value')
      .eq('key', ORDER_KEY)
      .maybeSingle()
      .then(({ data }) => {
        try {
          setOrder(data?.value ? JSON.parse(data.value) : []);
        } catch {
          setOrder([]);
        }
      });
  }, [db]);
  if (!saved || !order) return <Loading />;

  const sections = orderSections(all, order);
  const label = (k: TextKey) => SECTION_LABELS[k] ?? TEXTS[k].label;
  const q = query.trim().toLowerCase();
  const found = q
    ? (Object.keys(TEXTS) as TextKey[]).filter((k) => [label(k), ...Object.values(TEXTS[k].value), ...Object.values(saved[k] ?? {})].some((v) => v?.toLowerCase().includes(q)))
    : [];

  const current = (k: TextKey): L10n => draft[k] ?? { ...TEXTS[k].value, ...strip(saved[k]) };
  const changed = (k: TextKey) => draft[k] !== undefined;
  const customised = (k: TextKey) => Object.keys(strip(saved[k])).length > 0;
  const pending = Object.keys(draft) as TextKey[];

  async function save(keys: TextKey[]) {
    setBusy(keys.length === 1 ? keys[0] : 'all');
    const rows = keys.map((k) => ({ key: k, value: draft[k], grp: sectionOf[k], label: label(k), multiline: Boolean(TEXTS[k].multiline), updated_at: new Date().toISOString() }));
    const { error } = await db.from('site_texts').upsert(rows);
    setBusy(null);
    if (error) return window.alert(error.message);
    setSaved({ ...saved!, ...Object.fromEntries(keys.map((k) => [k, draft[k]])) });
    setDraft((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !keys.includes(k as TextKey))));
    publish();
  }

  function cancel(keys: TextKey[]) {
    setDraft((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !keys.includes(k as TextKey))));
  }

  async function reset(k: TextKey) {
    if (!(await askConfirm('Put the original wording back, in all three languages?'))) return;
    await db.from('site_texts').delete().eq('key', k);
    const { [k]: _, ...rest } = saved!;
    setSaved(rest);
    cancel([k]);
    publish();
  }

  async function move(i: number, by: -1 | 1) {
    const next = sections.map((s) => s.name);
    [next[i], next[i + by]] = [next[i + by], next[i]];
    const before = order;
    setOrder(next);
    const { error } = await db.from('app_settings').upsert({ key: ORDER_KEY, value: JSON.stringify(next), updated_at: new Date().toISOString() });
    if (error) {
      setOrder(before);
      window.alert(error.message);
    }
  }

  const field = (k: TextKey, showSection = false) => {
    const d = TEXTS[k];
    const v = current(k);
    return (
      <li key={k} className="border border-[var(--color-line)] bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="flex-1 text-sm">{label(k)}</span>
          {showSection && <span className="text-xs text-[var(--color-stone)]">{sectionOf[k]}</span>}
          {customised(k) && !changed(k) && (
            <button type="button" onClick={() => reset(k)} className="text-xs underline underline-offset-2">Original</button>
          )}
          {changed(k) && (
            <>
              <Button tone="dark" disabled={busy !== null} onClick={() => save([k])}>
                {busy === k ? 'Saving...' : 'Save'}
              </Button>
              <Button disabled={busy !== null} onClick={() => cancel([k])}>Cancel</Button>
            </>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {LOCALES.map((l) => (
            <div key={l}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--color-stone)]">{LOCALE_NAMES[l]}</span>
                {/* Always from English; from Dutch or French once that language has been rewritten here. */}
                {(l === 'en' || (draft[k] && draft[k][l] !== { ...TEXTS[k].value, ...strip(saved[k]) }[l])) && (
                  <TranslateButton value={v} from={l} onChange={(t) => setDraft({ ...draft, [k]: t })} />
                )}
              </span>
              {d.multiline ? (
                <textarea lang={l} aria-label={`${label(k)} (${LOCALE_NAMES[l]})`} rows={3} value={v[l] ?? ''} onChange={(e) => setDraft({ ...draft, [k]: { ...v, [l]: e.target.value } })} className={`${inputCls} resize-y text-sm`} />
              ) : (
                <input lang={l} aria-label={`${label(k)} (${LOCALE_NAMES[l]})`} value={v[l] ?? ''} onChange={(e) => setDraft({ ...draft, [k]: { ...v, [l]: e.target.value } })} className={`${inputCls} text-sm`} />
              )}
            </div>
          ))}
        </div>
      </li>
    );
  };

  return (
    <div>
      <PageTitle title="Texts" />
      <Help>
        Buttons, headings and messages across the site and in the emails, in the order they appear on the site. Open a section to change its texts. A change,
        typed or translated, is only kept once you press Save; Cancel puts it back. Words in {'{braces}'} are filled in by the site (a number, a name): keep
        them as they are. Your pieces, pages and events have their own pages in the menu on the left.
      </Help>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all texts" aria-label="Search texts" className={`${inputCls} !mt-0 max-w-72`} />
        {pending.length > 0 && (
          <span className="ml-auto flex flex-wrap items-center gap-2 text-sm">
            {pending.length === 1 ? '1 change not saved' : `${pending.length} changes not saved`}
            <span className="flex gap-2">
              <Button tone="dark" disabled={busy !== null} onClick={() => save(pending)}>
                {busy === 'all' ? 'Saving...' : 'Save all'}
              </Button>
              <Button disabled={busy !== null} onClick={() => cancel(pending)}>Cancel all</Button>
            </span>
          </span>
        )}
      </div>

      {q ? (
        found.length ? (
          <ul className="space-y-4">{found.map((k) => field(k, true))}</ul>
        ) : (
          <p className="text-sm text-[var(--color-stone)]">No text matches.</p>
        )
      ) : (
        <ol className="space-y-2">
          {sections.map((s, i) => {
            const isOpen = open === s.name;
            const unsaved = s.keys.filter(changed).length;
            return (
              <li key={s.name} className="border border-[var(--color-line)] bg-white">
                <div className="flex items-center gap-2 pr-2">
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.name)} className="flex flex-1 items-center gap-3 px-4 py-3 text-left">
                    <span className={`inline-block w-3 text-xs transition ${isOpen ? 'rotate-90' : ''}`} aria-hidden>
                      ›
                    </span>
                    <span className="flex-1">{s.name}</span>
                    {unsaved > 0 && <span className="text-xs text-[var(--color-gold)]">{unsaved} not saved</span>}
                    <span className="text-xs text-[var(--color-stone)]">{s.keys.length}</span>
                  </button>
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${s.name} up`} className="flex h-9 w-9 items-center justify-center text-lg text-[var(--color-stone)] hover:text-[var(--color-ink)] disabled:opacity-25">
                    ↑
                  </button>
                  <button type="button" disabled={i === sections.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${s.name} down`} className="flex h-9 w-9 items-center justify-center text-lg text-[var(--color-stone)] hover:text-[var(--color-ink)] disabled:opacity-25">
                    ↓
                  </button>
                </div>
                {isOpen && <ul className="space-y-4 border-t border-[var(--color-line)] bg-[var(--color-ivory)] p-4">{s.keys.map((k) => field(k))}</ul>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

const ORDER_KEY = 'admin_texts_section_order';

function strip(v: L10n | undefined): L10n {
  return Object.fromEntries(Object.entries(v ?? {}).filter(([, x]) => x?.trim()));
}
