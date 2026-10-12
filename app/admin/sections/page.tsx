'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Help, ImageField, L10nField, Loading, PageTitle, SaveState, TextField, Toggle, UpDown, show, useSave } from '@/components/admin/ui';
import { move, publish, saveOrder } from '@/lib/admin-client';
import { slugify } from '@/lib/format';
import { getAdminDb } from '@/lib/supabase';
import type { Attribute, Section } from '@/lib/types';

/** Shop sections (Rings, Necklaces...) and the filter values (metals, stones). */
export default function SectionsAdmin() {
  const db = getAdminDb();
  const [sections, setSections] = useState<Section[] | null>(null);
  const [attrs, setAttrs] = useState<Attribute[]>([]);
  const [editing, setEditing] = useState<Section | null>(null);
  const { state, run } = useSave();

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([db.from('sections').select('*').order('position'), db.from('attributes').select('*').order('position')]);
    setSections((s.data ?? []) as Section[]);
    setAttrs((a.data ?? []) as Attribute[]);
  }, [db]);
  useEffect(() => {
    load();
  }, [load]);

  if (!sections) return <Loading />;

  async function reorder(i: number, d: -1 | 1) {
    const next = move(sections!, i, d);
    setSections(next);
    await saveOrder('sections', next.map((s) => s.id));
    publish();
  }

  async function saveSection() {
    const s = editing!;
    const slug = slugify(s.slug || show(s.name));
    const row = { slug, name: s.name, description: s.description, cover_url: s.cover_url, visible: s.visible, show_prices: s.show_prices };
    const ok = await run(async () => (s.id ? db.from('sections').update(row).eq('id', s.id) : db.from('sections').insert({ ...row, position: sections!.length })));
    if (ok) {
      setEditing(null);
      load();
    }
  }

  async function removeSection(s: Section) {
    if (!window.confirm(`Delete the section “${show(s.name)}”? Its pieces stay, without a section.`)) return;
    await db.from('sections').delete().eq('id', s.id);
    publish();
    setEditing(null);
    load();
  }

  return (
    <div>
      <PageTitle title="Sections and filters">
        <Button tone="dark" onClick={() => setEditing({ id: '', slug: '', name: {}, description: {}, cover_url: null, position: 0, visible: true, show_prices: true })}>
          New section
        </Button>
      </PageTitle>
      <Help>The tabs of the shop. “All” is always there. Use the arrows to change their order on the site.</Help>

      <ul className="mb-10 divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-white">
        {sections.map((s, i) => (
          <li key={s.id} className={`flex items-center gap-4 p-3 ${s.visible ? '' : 'opacity-55'}`}>
            <span className="font-display flex-1 text-xl">{show(s.name)}</span>
            {!s.visible && <Badge>Hidden</Badge>}
            {!s.show_prices && <Badge>Prices hidden</Badge>}
            <Button onClick={() => setEditing(s)}>Edit</Button>
            <UpDown index={i} count={sections.length} onMove={(d) => reorder(i, d)} />
          </li>
        ))}
      </ul>

      {editing && (
        <Card title={editing.id ? `Edit ${show(editing.name)}` : 'New section'} className="mb-10">
          <div className="grid gap-5">
            <L10nField label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <L10nField label="Introduction" value={editing.description} onChange={(v) => setEditing({ ...editing, description: v })} multiline rows={2} />
            <TextField label="Web address" value={editing.slug} onChange={(v) => setEditing({ ...editing, slug: v })} hint={`/shop/${slugify(editing.slug || show(editing.name)) || '...'}`} />
            <ImageField label="Photo (homepage tile)" value={editing.cover_url} onChange={(v) => setEditing({ ...editing, cover_url: v })} folder="sections" aspect="aspect-[3/4]" />
            <Toggle label="Visible on the site" checked={editing.visible} onChange={(v) => setEditing({ ...editing, visible: v })} hint="Hiding a section also hides its pieces." />
            <Toggle label="Show prices in this section" checked={editing.show_prices} onChange={(v) => setEditing({ ...editing, show_prices: v })} hint="Off: every piece here shows “Price on request”." />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button tone="dark" onClick={saveSection}>Save</Button>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            {editing.id && <Button tone="danger" onClick={() => removeSection(editing)}>Delete</Button>}
            <SaveState state={state} />
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <AttributeList kind="metal" title="Metals" all={attrs} reload={load} />
        <AttributeList kind="stone" title="Stones" all={attrs} reload={load} />
      </div>
    </div>
  );
}

function AttributeList({ kind, title, all, reload }: { kind: 'metal' | 'stone'; title: string; all: Attribute[]; reload: () => void }) {
  const db = getAdminDb();
  const list = all.filter((a) => a.kind === kind);
  const [edit, setEdit] = useState<Attribute | null>(null);

  async function save() {
    const a = edit!;
    const slug = slugify(a.slug || show(a.label));
    const row = { kind, slug, label: a.label };
    const r = a.id ? await db.from('attributes').update(row).eq('id', a.id) : await db.from('attributes').insert({ ...row, position: list.length });
    if (r.error) return window.alert(r.error.message);
    setEdit(null);
    publish();
    reload();
  }

  return (
    <Card title={`Filter: ${title}`}>
      <ul className="mb-4 divide-y divide-[var(--color-line)]">
        {list.map((a, i) => (
          <li key={a.id} className="flex items-center gap-3 py-2">
            <span className="flex-1">{show(a.label)}</span>
            <button className="text-xs underline underline-offset-2" onClick={() => setEdit(a)}>Edit</button>
            <button
              className="text-xs text-red-800 underline underline-offset-2"
              onClick={async () => {
                if (!window.confirm(`Delete “${show(a.label)}”? Pieces keep everything else.`)) return;
                await db.from('attributes').delete().eq('id', a.id);
                publish();
                reload();
              }}
            >
              Delete
            </button>
            <UpDown
              index={i}
              count={list.length}
              onMove={async (d) => {
                await saveOrder('attributes', move(list, i, d).map((x) => x.id));
                publish();
                reload();
              }}
            />
          </li>
        ))}
      </ul>
      {edit ? (
        <div className="space-y-3">
          <L10nField label="Name" value={edit.label} onChange={(v) => setEdit({ ...edit, label: v })} />
          <div className="flex gap-2">
            <Button tone="dark" onClick={save}>Save</Button>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setEdit({ id: '', kind, slug: '', label: {}, position: 0 })}>Add</Button>
      )}
    </Card>
  );
}
