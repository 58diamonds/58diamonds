'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Help, Loading, PageTitle, UpDown, inputCls, show } from '@/components/admin/ui';
import { move, publish, saveOrder, useNewFromLink } from '@/lib/admin-client';
import { formatPrice } from '@/lib/format';
import { pieceStock } from '@/lib/shop';
import { getAdminDb } from '@/lib/supabase';
import type { Piece, Section } from '@/lib/types';

export default function PiecesAdmin() {
  const db = getAdminDb();
  const router = useRouter();
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [section, setSection] = useState<string>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([
      db.from('pieces').select('*, piece_images(*), piece_variants(*)').order('position'),
      db.from('sections').select('*').order('position'),
    ]);
    setPieces(((p.data ?? []) as Piece[]).map((x) => ({ ...x, piece_images: [...x.piece_images].sort((a, b) => a.position - b.position) })));
    setSections((s.data ?? []) as Section[]);
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (pieces ?? [])
      .filter((p) => section === 'all' || (section === 'none' ? !p.section_id : p.section_id === section))
      .filter((p) => !q || [p.title.en, p.title.nl, p.title.fr, p.slug].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => {
        const sa = sections.findIndex((s) => s.id === a.section_id);
        const sb = sections.findIndex((s) => s.id === b.section_id);
        return section === 'all' ? sa - sb || a.position - b.position : a.position - b.position;
      });
  }, [pieces, section, sections, query]);

  async function reorder(index: number, delta: -1 | 1) {
    const next = move(shown, index, delta);
    setPieces((all) => (all ?? []).map((p) => ({ ...p, position: next.findIndex((n) => n.id === p.id) >= 0 ? next.findIndex((n) => n.id === p.id) : p.position })));
    await saveOrder('pieces', next.map((p) => p.id));
    publish();
  }

  async function toggleVisible(p: Piece) {
    await db.from('pieces').update({ visible: !p.visible }).eq('id', p.id);
    publish();
    load();
  }

  async function create() {
    const slug = `new-piece-${Date.now().toString(36)}`;
    const target = section !== 'all' && section !== 'none' ? section : sections[0]?.id ?? null;
    const position = (pieces ?? []).filter((p) => p.section_id === target).length;
    const { data, error } = await db
      .from('pieces')
      .insert({ slug, title: { en: 'New piece' }, section_id: target, visible: false, position, price: null })
      .select('id')
      .single();
    if (!error && data) router.push(`/admin/pieces/${data.id}`);
  }

  useNewFromLink(create, Boolean(pieces) && sections.length > 0);
  if (!pieces) return <Loading />;

  return (
    <div>
      <PageTitle title="Pieces">
        <Button tone="dark" onClick={create}>
          New piece
        </Button>
      </PageTitle>
      <Help>
        Every piece in the collection. Use the arrows to set the order they appear in on the site (choose a section first). A hidden piece stays here but
        is off the site. To add one, press New piece; to remove one for good, open it and press Delete.
      </Help>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {[{ id: 'all', label: 'All' }, ...sections.map((s) => ({ id: s.id, label: show(s.name) })), { id: 'none', label: 'No section' }].map((s) => (
          <button key={s.id} type="button" onClick={() => setSection(s.id)} className="chip" aria-pressed={section === s.id}>
            {s.label}
          </button>
        ))}
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search pieces" className={`${inputCls} !mt-0 ml-auto max-w-56`} />
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-[var(--color-stone)]">No pieces here yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-white">
          {shown.map((p, i) => {
            const stock = pieceStock(p);
            return (
              <li key={p.id} className={`flex items-center gap-4 p-3 ${p.visible ? '' : 'opacity-55'}`}>
                <Link href={`/admin/pieces/${p.id}`} className="h-16 w-14 shrink-0 overflow-hidden bg-[var(--color-pearl)]">
                  {p.piece_images[0] && <img src={p.piece_images[0].url} alt="" className="h-full w-full object-cover" />}
                </Link>
                <Link href={`/admin/pieces/${p.id}`} className="min-w-0 flex-1">
                  <span className="font-display block truncate text-xl">{show(p.title) || '(no title)'}</span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-stone)]">
                    {p.price != null ? formatPrice(Number(p.price), 'EUR') : 'No price'}
                    {!p.show_price && <Badge>On request</Badge>}
                    {p.for_sale && p.show_price && p.price != null && <span>· {stock} in stock</span>}
                    {p.for_sale && stock === 0 && <Badge tone="warn">Sold out</Badge>}
                    {p.featured && <Badge tone="gold">Homepage</Badge>}
                    {!p.visible && <Badge>Hidden</Badge>}
                    {section === 'all' && <span>· {show(sections.find((s) => s.id === p.section_id)?.name) || 'No section'}</span>}
                  </span>
                </Link>
                <Button onClick={() => toggleVisible(p)}>{p.visible ? 'Hide' : 'Show'}</Button>
                {section !== 'all' && <UpDown index={i} count={shown.length} onMove={(d) => reorder(i, d)} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
