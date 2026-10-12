'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Help, L10nField, Loading, PageTitle, SaveState, SelectField, TextField, UpDown, show, useSave } from '@/components/admin/ui';
import { move, publish, saveOrder, useNewFromLink } from '@/lib/admin-client';
import { SHOP_LIVE } from '@/lib/config';
import { getAdminDb } from '@/lib/supabase';
import type { MenuItem, MenuTarget, Page, Section } from '@/lib/types';

const BUILTIN: { value: MenuTarget; label: string }[] = [
  { value: 'shop', label: 'Collection (all pieces)' },
  { value: 'events', label: 'Events' },
  { value: 'press', label: 'Press' },
  { value: 'contact', label: 'Contact and appointments' },
  ...(SHOP_LIVE ? [{ value: 'account' as MenuTarget, label: 'Client account' }] : []),
  { value: 'home', label: 'Homepage' },
];

/** The top menu and the footer links: rename, reorder, hide, add, remove. */
export default function MenuAdmin() {
  const db = getAdminDb();
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [edit, setEdit] = useState<MenuItem | null>(null);
  const { state, run } = useSave();

  const load = useCallback(async () => {
    const [m, p, s] = await Promise.all([
      db.from('menu_items').select('*').order('position'),
      db.from('pages').select('*').order('slug'),
      db.from('sections').select('*').order('position'),
    ]);
    setItems((m.data ?? []) as MenuItem[]);
    setPages((p.data ?? []) as Page[]);
    setSections((s.data ?? []) as Section[]);
  }, [db]);
  useEffect(() => {
    load();
  }, [load]);
  useNewFromLink(() => setEdit(blank('header')), Boolean(items));
  if (!items) return <Loading />;

  const target = (i: MenuItem) => {
    if (i.kind === 'builtin') return BUILTIN.find((b) => b.value === i.target)?.label ?? i.target;
    if (i.kind === 'page') return `Page: ${show(pages.find((p) => p.id === i.page_id)?.title) || '(deleted)'}`;
    if (i.kind === 'section') return `Section: ${show(sections.find((s) => s.id === i.section_id)?.name) || '(deleted)'}`;
    return i.url ?? '';
  };

  async function save() {
    const i = edit!;
    const row = {
      menu: i.menu,
      kind: i.kind,
      target: i.kind === 'builtin' ? i.target : null,
      page_id: i.kind === 'page' ? i.page_id : null,
      section_id: i.kind === 'section' ? i.section_id : null,
      url: i.kind === 'link' ? i.url : null,
      label: i.label,
      visible: i.visible,
    };
    const ok = await run(async () =>
      i.id ? db.from('menu_items').update(row).eq('id', i.id) : db.from('menu_items').insert({ ...row, position: items!.filter((x) => x.menu === i.menu).length }),
    );
    if (ok) {
      setEdit(null);
      load();
    }
  }

  const blank = (menu: MenuItem['menu']): MenuItem => ({ id: '', menu, kind: 'page', target: null, page_id: pages[0]?.id ?? null, section_id: null, url: null, label: {}, position: 0, visible: true });

  return (
    <div>
      <PageTitle title="Menus" />
      <Help>
        What visitors see in the top menu and at the bottom of every page. Use the arrows to reorder. Press only appears once it is switched on and has an
        article; Events only while switched on. An empty name uses the page or section name.
      </Help>

      <div className="grid gap-6 lg:grid-cols-2">
        {(['header', 'footer'] as const).map((menu) => {
          const list = items.filter((i) => i.menu === menu).sort((a, b) => a.position - b.position);
          return (
            <Card key={menu} title={menu === 'header' ? 'Top menu' : 'Footer links'}>
              <ul className="mb-4 divide-y divide-[var(--color-line)]">
                {list.map((i, idx) => (
                  <li key={i.id} className={`flex items-center gap-3 py-2.5 ${i.visible ? '' : 'opacity-50'}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{show(i.label) || target(i)}</span>
                      <span className="block truncate text-xs text-[var(--color-stone)]">{target(i)}</span>
                    </span>
                    {!i.visible && <Badge>Hidden</Badge>}
                    <button className="text-xs underline underline-offset-2" onClick={() => setEdit(i)}>Edit</button>
                    <UpDown
                      index={idx}
                      count={list.length}
                      onMove={async (d) => {
                        const next = move(list, idx, d);
                        setItems([...items.filter((x) => x.menu !== menu), ...next.map((x, position) => ({ ...x, position }))]);
                        await saveOrder('menu_items', next.map((x) => x.id));
                        publish();
                      }}
                    />
                  </li>
                ))}
              </ul>
              <Button onClick={() => setEdit(blank(menu))}>Add a menu item</Button>
            </Card>
          );
        })}
      </div>

      {edit && (
        <Card title={edit.id ? 'Edit link' : 'New link'} className="mt-6">
          <div className="grid gap-5">
            <SelectField
              label="Opens"
              value={edit.kind}
              onChange={(kind) =>
                setEdit({ ...edit, kind, target: kind === 'builtin' ? 'shop' : null, page_id: kind === 'page' ? pages[0]?.id ?? null : null, section_id: kind === 'section' ? sections[0]?.id ?? null : null })
              }
              options={[
                { value: 'page', label: 'One of your pages' },
                { value: 'section', label: 'A shop section' },
                { value: 'builtin', label: 'A part of the site' },
                { value: 'link', label: 'Another address' },
              ]}
            />
            {edit.kind === 'builtin' && <SelectField label="Part of the site" value={edit.target ?? 'shop'} onChange={(v) => setEdit({ ...edit, target: v })} options={BUILTIN} />}
            {edit.kind === 'page' && (
              <SelectField label="Page" value={edit.page_id ?? ''} onChange={(v) => setEdit({ ...edit, page_id: v })} options={pages.map((p) => ({ value: p.id, label: show(p.title) || p.slug }))} />
            )}
            {edit.kind === 'section' && (
              <SelectField label="Section" value={edit.section_id ?? ''} onChange={(v) => setEdit({ ...edit, section_id: v })} options={sections.map((s) => ({ value: s.id, label: show(s.name) }))} />
            )}
            {edit.kind === 'link' && <TextField label="Address" value={edit.url ?? ''} onChange={(v) => setEdit({ ...edit, url: v })} placeholder="https://..." />}
            <L10nField label="Name in the menu" value={edit.label} onChange={(v) => setEdit({ ...edit, label: v })} />
            <SelectField label="Shown" value={edit.visible ? 'yes' : 'no'} onChange={(v) => setEdit({ ...edit, visible: v === 'yes' })} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No, hidden' }]} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button tone="dark" onClick={save}>Save</Button>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
            {edit.id && (
              <Button
                tone="danger"
                onClick={async () => {
                  if (!window.confirm('Remove this link from the menu? The page itself stays.')) return;
                  await db.from('menu_items').delete().eq('id', edit.id);
                  publish();
                  setEdit(null);
                  load();
                }}
              >
                Remove
              </Button>
            )}
            <SaveState state={state} />
          </div>
        </Card>
      )}
    </div>
  );
}
