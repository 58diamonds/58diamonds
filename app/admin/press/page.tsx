'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, DeleteZone, FileField, Help, ImageField, L10nField, Loading, PageTitle, SaveState, TextField, Toggle, UpDown, inputCls, show, useSave } from '@/components/admin/ui';
import { move, publish, saveOrder } from '@/lib/admin-client';
import { getAdminDb } from '@/lib/supabase';
import type { PressArticle } from '@/lib/types';

/**
 * Articles about the brand. The Press tab shows only when it is switched on
 * here and at least one article is published.
 */
export default function PressAdmin() {
  const db = getAdminDb();
  const [items, setItems] = useState<PressArticle[] | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [edit, setEdit] = useState<PressArticle | null>(null);
  const { state, run, setState } = useSave();

  const load = useCallback(async () => {
    const [a, s] = await Promise.all([db.from('press_articles').select('*').order('position'), db.from('settings').select('press_enabled').eq('id', 1).maybeSingle()]);
    setItems((a.data ?? []) as PressArticle[]);
    setEnabled(Boolean(s.data?.press_enabled));
  }, [db]);
  useEffect(() => {
    load();
  }, [load]);

  if (!items) return <Loading />;
  const live = items.filter((i) => i.published).length;

  async function setOn(v: boolean) {
    setEnabled(v);
    await db.from('settings').update({ press_enabled: v }).eq('id', 1);
    publish();
  }

  async function save() {
    const a = edit!;
    if (!show(a.title)) return setState({ error: 'Give the article a title.' });
    if (!a.url && !a.file_url) return setState({ error: 'Add a link to the article or upload it as a file.' });
    const row = { title: a.title, publication: a.publication, published_on: a.published_on || null, image_url: a.image_url, url: a.url || null, file_url: a.file_url, published: a.published };
    const ok = await run(async () => (a.id ? db.from('press_articles').update(row).eq('id', a.id) : db.from('press_articles').insert({ ...row, position: items!.length })));
    if (ok) {
      setEdit(null);
      load();
    }
  }

  return (
    <div>
      <PageTitle title="Press">
        <Button tone="dark" onClick={() => setEdit({ id: '', title: {}, publication: '', published_on: null, image_url: null, url: null, file_url: null, position: 0, published: true })}>
          Add an article
        </Button>
      </PageTitle>
      <div className="mb-6 max-w-xl">
        <Toggle label="Show Press on the site" checked={enabled} onChange={setOn} />
      </div>
      <Help>
        {enabled && live > 0
          ? 'The Press tab is on the site.'
          : enabled
            ? 'Press is switched on but has no published article yet, so the tab stays hidden.'
            : 'The Press tab is hidden. Add articles first, then switch it on.'}{' '}
        Use the arrows to choose the order on the Press page.
      </Help>

      <ul className="mb-10 divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-white">
        {items.map((a, i) => (
          <li key={a.id} className="flex items-center gap-4 p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden bg-[var(--color-pearl)]">{a.image_url && <img src={a.image_url} alt="" className="h-full w-full object-cover" />}</div>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{show(a.title)}</span>
              <span className="text-xs text-[var(--color-stone)]">
                {[a.publication, a.published_on && new Date(a.published_on).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })].filter(Boolean).join(' · ')}
              </span>
            </span>
            {!a.published && <Badge tone="dark">Hidden</Badge>}
            <Button onClick={() => setEdit(a)}>Edit</Button>
            <UpDown
              index={i}
              count={items.length}
              onMove={async (d) => {
                const next = move(items, i, d);
                setItems(next);
                await saveOrder('press_articles', next.map((x) => x.id));
                publish();
              }}
            />
          </li>
        ))}
        {items.length === 0 && <li className="p-4 text-sm text-[var(--color-stone)]">No articles yet.</li>}
      </ul>

      {edit && (
        <Card title={edit.id ? 'Edit article' : 'New article'}>
          <div className="grid gap-5">
            <L10nField label="Title" value={edit.title} onChange={(title) => setEdit({ ...edit, title })} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Magazine or website" value={edit.publication} onChange={(publication) => setEdit({ ...edit, publication })} placeholder="Vogue Belgium" />
              <label className="block">
                <span className="text-sm">Date</span>
                <input type="date" value={edit.published_on ?? ''} onChange={(e) => setEdit({ ...edit, published_on: e.target.value || null })} className={inputCls} />
              </label>
            </div>
            <TextField label="Link to the article" value={edit.url ?? ''} onChange={(url) => setEdit({ ...edit, url })} placeholder="https://..." />
            <FileField label="Or the article as a PDF or scan" value={edit.file_url} onChange={(file_url) => setEdit({ ...edit, file_url })} folder="press" />
            <ImageField label="Photo" value={edit.image_url} onChange={(image_url) => setEdit({ ...edit, image_url })} folder="press" aspect="aspect-[4/5]" hint="The cover or a page of the article." />
            <Toggle label="Published" checked={edit.published} onChange={(published) => setEdit({ ...edit, published })} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button tone="dark" onClick={save}>Save</Button>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
            <SaveState state={state} />
          </div>
          {edit.id && (
            <DeleteZone>
              <Button
                tone="danger"
                onClick={async () => {
                  if (!window.confirm('Delete this article?')) return;
                  await db.from('press_articles').delete().eq('id', edit.id);
                  publish();
                  setEdit(null);
                  load();
                }}
              >
                Delete this article
              </Button>
            </DeleteZone>
          )}
        </Card>
      )}
    </div>
  );
}
