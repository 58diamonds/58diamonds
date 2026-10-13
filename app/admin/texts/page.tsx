'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Button, Help, Loading, PageTitle, TranslateButton, inputCls } from '@/components/admin/ui';
import { publish } from '@/lib/admin-client';
import { LOCALES, LOCALE_NAMES, type L10n } from '@/lib/i18n';
import { getAdminDb } from '@/lib/supabase';
import { TEXTS, type TextKey } from '@/lib/texts';
import { askConfirm } from '@/components/admin/confirm';

export default function TextsAdmin() {
  return (
    <Suspense fallback={<Loading />}>
      <Texts />
    </Suspense>
  );
}

/**
 * Every fixed text of the site, in the three languages, grouped by where it
 * appears. A changed text is saved on its own; "Original" puts the starting
 * wording back.
 */
function Texts() {
  const db = getAdminDb();
  const groups = useMemo(() => [...new Set(Object.values(TEXTS).map((d) => d.group))], []);
  const [group, setGroup] = useState(useSearchParams().get('group') ?? groups[0]);
  const [saved, setSaved] = useState<Record<string, L10n> | null>(null);
  const [draft, setDraft] = useState<Record<string, L10n>>({});
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    db.from('site_texts')
      .select('key, value')
      .then(({ data }) => setSaved(Object.fromEntries((data ?? []).map((r: { key: string; value: L10n }) => [r.key, r.value]))));
  }, [db]);
  if (!saved) return <Loading />;

  const q = query.trim().toLowerCase();
  const keys = (Object.keys(TEXTS) as TextKey[]).filter((k) => {
    const d = TEXTS[k];
    if (q) return [d.label, ...Object.values(d.value), ...Object.values(saved[k] ?? {})].some((v) => v?.toLowerCase().includes(q));
    return d.group === group;
  });

  const current = (k: TextKey): L10n => draft[k] ?? { ...TEXTS[k].value, ...strip(saved[k]) };
  const changed = (k: TextKey) => draft[k] !== undefined;
  const customised = (k: TextKey) => Object.keys(strip(saved[k])).length > 0;

  async function save(k: TextKey) {
    setBusy(k);
    const value = draft[k];
    const def = TEXTS[k];
    const { error } = await db.from('site_texts').upsert({ key: k, value, grp: def.group, label: def.label, multiline: Boolean(def.multiline), updated_at: new Date().toISOString() });
    setBusy(null);
    if (error) return window.alert(error.message);
    setSaved({ ...saved!, [k]: value });
    setDraft(({ [k]: _, ...rest }) => rest);
    publish();
  }

  async function reset(k: TextKey) {
    if (!(await askConfirm('Put the original wording back, in all three languages?'))) return;
    await db.from('site_texts').delete().eq('key', k);
    const { [k]: _, ...rest } = saved!;
    setSaved(rest);
    setDraft(({ [k]: __, ...d }) => d);
    publish();
  }

  return (
    <div>
      <PageTitle title="Texts" />
      <Help>
        Buttons, headings and messages across the site and in the emails. Words in {'{braces}'} are filled in by the site (a number, a name): keep them as
        they are. Your pieces, pages and events have their own pages in the menu on the left.
      </Help>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {groups.map((g) => (
          <button key={g} type="button" className="chip" aria-pressed={!q && group === g} onClick={() => { setGroup(g); setQuery(''); }}>
            {g}
          </button>
        ))}
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all texts" aria-label="Search texts" className={`${inputCls} !mt-0 ml-auto max-w-60`} />
      </div>

      <ul className="space-y-4">
        {keys.map((k) => {
          const d = TEXTS[k];
          const v = current(k);
          return (
            <li key={k} className="border border-[var(--color-line)] bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <span className="flex-1 text-sm">{d.label}</span>
                {q && <span className="text-xs text-[var(--color-stone)]">{d.group}</span>}
                {customised(k) && !changed(k) && (
                  <button type="button" onClick={() => reset(k)} className="text-xs underline underline-offset-2">Original</button>
                )}
                {changed(k) && (
                  <Button tone="dark" disabled={busy === k} onClick={() => save(k)}>
                    {busy === k ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {LOCALES.map((l) => (
                  <div key={l}>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--color-stone)]">{LOCALE_NAMES[l]}</span>
                      {/* From English at any time; from Dutch or French once rewritten here. */}
                      {(l === 'en' || (draft[k] && draft[k][l] !== { ...TEXTS[k].value, ...strip(saved[k]) }[l])) && (
                        <TranslateButton value={v} from={l} onChange={(t) => setDraft({ ...draft, [k]: t })} />
                      )}
                    </span>
                    {d.multiline ? (
                      <textarea lang={l} aria-label={`${d.label} (${LOCALE_NAMES[l]})`} rows={3} value={v[l] ?? ''} onChange={(e) => setDraft({ ...draft, [k]: { ...v, [l]: e.target.value } })} className={`${inputCls} resize-y text-sm`} />
                    ) : (
                      <input lang={l} aria-label={`${d.label} (${LOCALE_NAMES[l]})`} value={v[l] ?? ''} onChange={(e) => setDraft({ ...draft, [k]: { ...v, [l]: e.target.value } })} className={`${inputCls} text-sm`} />
                    )}
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function strip(v: L10n | undefined): L10n {
  return Object.fromEntries(Object.entries(v ?? {}).filter(([, x]) => x?.trim()));
}
