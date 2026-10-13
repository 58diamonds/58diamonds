'use client';

/* eslint-disable @next/next/no-img-element */
import { SHOP_LIVE } from '@/lib/config';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  AddressField,
  Badge,
  Button,
  Card,
  L10nField,
  Loading,
  NumberField,
  PageTitle,
  SaveBar,
  SelectField,
  TextField,
  Toggle,
  UpDown,
  inputCls,
  show,
  useSave,
} from '@/components/admin/ui';
import { freeSlug, move, publish, uploadImage } from '@/lib/admin-client';
import { stonesOf } from '@/lib/shop';
import { DEFAULT_KARAT, KARATS, isGold } from '@/lib/specs';
import { isPlaceholderSlug } from '@/lib/slug';
import { slugify } from '@/lib/format';
import { getAdminDb } from '@/lib/supabase';
import type { Attribute, Piece, PieceImage, PieceVariant, Section } from '@/lib/types';
import { askConfirm } from '@/components/admin/confirm';

const RING_SIZES = ['48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60'];
type Img = Omit<PieceImage, 'piece_id'> & { isNew?: boolean };
type Var = Omit<PieceVariant, 'piece_id'> & { isNew?: boolean };

export default function PieceEditor() {
  const { id } = useParams<{ id: string }>();
  // "new": nothing is stored until the first Save.
  const isNew = id === 'new';
  const router = useRouter();
  const db = getAdminDb();
  const [piece, setPiece] = useState<Piece | null>(null);
  const [images, setImages] = useState<Img[]>([]);
  const [variants, setVariants] = useState<Var[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [attrs, setAttrs] = useState<Attribute[]>([]);
  const [uploading, setUploading] = useState(false);
  // The address follows the name until the piece is first shown on the site.
  const [autoAddr, setAutoAddr] = useState(false);
  const removed = useRef<{ images: string[]; variants: string[] }>({ images: [], variants: [] });
  const file = useRef<HTMLInputElement>(null);
  const { state, run, setState } = useSave();

  useEffect(() => {
    (async () => {
      const [p, s, a] = await Promise.all([
        isNew ? Promise.resolve({ data: null }) : db.from('pieces').select('*, piece_images(*), piece_variants(*)').eq('id', id).maybeSingle(),
        db.from('sections').select('*').order('position'),
        db.from('attributes').select('*').order('position'),
      ]);
      if (!isNew && !p.data) return router.replace('/admin/pieces');
      const row = (p.data as Piece | null) ?? blankPiece(new URLSearchParams(window.location.search).get('section') || (s.data?.[0]?.id as string | undefined) || null);
      setPiece({ ...row, price: row.price == null ? null : Number(row.price), weight_g: row.weight_g == null ? null : Number(row.weight_g) });
      setAutoAddr(isPlaceholderSlug(row.slug) || (!row.visible && row.slug === slugify(row.title.en ?? '')));
      setImages([...row.piece_images].sort((x, y) => x.position - y.position));
      setVariants([...row.piece_variants].sort((x, y) => x.position - y.position));
      setSections((s.data ?? []) as Section[]);
      setAttrs((a.data ?? []) as Attribute[]);
    })();
  }, [db, id, isNew, router]);

  if (!piece) return <Loading />;
  const set = (patch: Partial<Piece>) => setPiece((p) => (p ? { ...p, ...patch } : p));

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const url = await uploadImage(f, `pieces/${piece!.id}`);
        setImages((imgs) => [...imgs, { id: crypto.randomUUID(), url, alt: {}, position: imgs.length, worn: false, isNew: true }]);
      }
    } catch (e) {
      setState({ error: e instanceof Error ? e.message : 'Upload failed.' });
    }
    setUploading(false);
    if (file.current) file.current.value = '';
  }

  async function save() {
    const p = piece!;
    let slug = p.slug;
    const ok = await run(async () => {
      const base = (autoAddr ? slugify(show(p.title)) : slugify(p.slug)) || slugify(show(p.title)) || `piece-${Date.now().toString(36)}`;
      slug = await freeSlug('pieces', base, p.id);
      const fields = {
          slug,
          title: p.title,
          description: p.description,
          details: p.details,
          section_id: p.section_id,
          metal_id: p.metal_id,
          stone_ids: stonesOf(p),
          stone_id: stonesOf(p)[0] ?? null,
          stone_carats: Object.fromEntries(stonesOf(p).filter((sid) => Number(p.stone_carats?.[sid]) > 0).map((sid) => [sid, Number(p.stone_carats[sid])])),
          karat: isGold(metals.find((m) => m.id === p.metal_id)) ? (p.karat ?? DEFAULT_KARAT) : null,
          weight_g: p.weight_g != null && p.weight_g > 0 ? p.weight_g : null,
          price: p.price,
          show_price: p.show_price,
          for_sale: p.for_sale,
          stock: Math.max(0, Math.floor(p.stock || 0)),
          visible: p.visible,
          featured: p.featured,
          seo_title: p.seo_title,
          seo_description: p.seo_description,
          published_at: p.published_at,
          updated_at: new Date().toISOString(),
      };
      const { error } = isNew
        ? await db.from('pieces').insert({ ...fields, id: p.id, position: await nextPosition(p.section_id) })
        : await db.from('pieces').update(fields).eq('id', p.id);
      if (error) return { error };

      const del = removed.current;
      if (del.images.length) await db.from('piece_images').delete().in('id', del.images);
      if (del.variants.length) {
        const r = await db.from('piece_variants').delete().in('id', del.variants);
        if (r.error) return r;
      }
      const imgRows = images.map((im, position) => ({ id: im.id, piece_id: p.id, url: im.url, alt: im.alt, position, worn: im.worn }));
      if (imgRows.length) {
        const r = await db.from('piece_images').upsert(imgRows);
        if (r.error) return r;
      }
      const varRows = variants
        .filter((v) => v.label.trim())
        .map((v, position) => ({ id: v.id, piece_id: p.id, label: v.label.trim(), stock: Math.max(0, Math.floor(v.stock || 0)), position }));
      if (varRows.length) {
        const r = await db.from('piece_variants').upsert(varRows);
        if (r.error) return r;
      }
      removed.current = { images: [], variants: [] };
      return { error: null };
    });
    if (ok && isNew) return router.replace(`/admin/pieces/${p.id}`);
    if (ok) {
      set({ slug });
      setImages((xs) => xs.map((x) => ({ ...x, isNew: false })));
      setVariants((xs) => xs.filter((v) => v.label.trim()).map((x) => ({ ...x, isNew: false })));
    }
  }

  async function nextPosition(section: string | null) {
    const q = db.from('pieces').select('id', { count: 'exact', head: true });
    const { count } = await (section ? q.eq('section_id', section) : q.is('section_id', null));
    return count ?? 0;
  }

  async function remove() {
    if (isNew) return router.replace('/admin/pieces');
    if (!(await askConfirm('Delete this piece for good? Orders that contain it keep their copy of its name and price.'))) return;
    const { error } = await db.from('pieces').delete().eq('id', piece!.id);
    if (error) return setState({ error: `The piece could not be deleted: ${error.message}` });
    publish();
    router.replace('/admin/pieces');
  }

  const metals = attrs.filter((a) => a.kind === 'metal');
  const stones = attrs.filter((a) => a.kind === 'stone');
  const sizeStock = variants.reduce((s, v) => s + (v.stock || 0), 0);

  return (
    <div>
      <PageTitle title={show(piece.title) || (isNew ? 'New piece' : 'Piece')} back={{ href: '/admin/pieces', label: 'Pieces' }}>
        {!isNew && (
          <a href={`/en/piece/${piece.slug}`} target="_blank" rel="noreferrer" className="self-center text-xs uppercase tracking-[0.16em] underline underline-offset-4">
            View on site ↗
          </a>
        )}
      </PageTitle>

      <div className="grid gap-6">
        <Card title="Text">
          <div className="grid gap-5">
            <L10nField label="Name" value={piece.title} onChange={(v) => set({ title: v })} />
            <L10nField label="Story" value={piece.description} onChange={(v) => set({ description: v })} multiline rows={5} hint="Shown under the name. A blank line starts a new paragraph." />
            <L10nField label="Details" value={piece.details} onChange={(v) => set({ details: v })} multiline rows={4} hint="One detail per line, e.g. Carat: 1.20 ct. Metal and stone below are added automatically." />
          </div>
        </Card>

        <Card title="Photos">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {images.map((im, i) => (
              <li key={im.id} className="border border-[var(--color-line)] p-2">
                <img src={im.url} alt="" className="aspect-[4/5] w-full object-cover" />
                <div className="mt-2 flex items-center justify-between gap-1">
                  {i === 0 ? <Badge tone="gold">Main</Badge> : <span />}
                  <UpDown index={i} count={images.length} onMove={(d) => setImages(move(images, i, d))} />
                </div>
                <input
                  value={im.alt.en ?? ''}
                  onChange={(e) => setImages(images.map((x) => (x.id === im.id ? { ...x, alt: { ...x.alt, en: e.target.value } } : x)))}
                  placeholder="Describe (for Google)"
                  className={`${inputCls} !py-1.5 text-xs`}
                />
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={im.worn}
                    onChange={(e) => setImages(images.map((x) => ({ ...x, worn: x.id === im.id ? e.target.checked : e.target.checked ? false : x.worn })))}
                  />
                  Worn photo
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!im.isNew) removed.current.images.push(im.id);
                    setImages(images.filter((x) => x.id !== im.id));
                  }}
                  className="mt-2 text-xs text-red-800 underline underline-offset-2"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => file.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Add photos'}
            </Button>
            <span className="text-xs text-[var(--color-stone)]">The first photo is the main one. Tick the worn photo: the collection shows it on hover and the homepage squares use it. Large photos are made smaller automatically.</span>
          </div>
          <input ref={file} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
        </Card>

        <Card title="Where it shows">
          <div className="grid gap-5 sm:grid-cols-3">
            <SelectField
              label="Section"
              value={piece.section_id ?? ''}
              onChange={(v) => set({ section_id: v || null })}
              options={[{ value: '', label: 'No section' }, ...sections.map((s) => ({ value: s.id, label: show(s.name) }))]}
            />
            <SelectField
              label="Metal (filter)"
              value={piece.metal_id ?? ''}
              onChange={(v) => set({ metal_id: v || null, karat: isGold(metals.find((m) => m.id === v)) ? (piece.karat ?? DEFAULT_KARAT) : null })}
              options={[{ value: '', label: '-' }, ...metals.map((m) => ({ value: m.id, label: show(m.label) }))]}
            />
            <StonePicker
              stones={stones}
              value={stonesOf(piece)}
              onChange={(ids) => set({ stone_ids: ids, stone_id: ids[0] ?? null })}
              onAdded={(a) => setAttrs((xs) => [...xs, a])}
            />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {isGold(metals.find((m) => m.id === piece.metal_id)) && (
              <SelectField
                label="Gold"
                value={String(piece.karat ?? DEFAULT_KARAT)}
                onChange={(v) => set({ karat: Number(v) })}
                options={KARATS.map((k) => ({ value: String(k), label: `${k}kt` }))}
              />
            )}
            <NumberField label="Weight (grams)" value={piece.weight_g} step={0.01} onChange={(v) => set({ weight_g: v })} hint="Shown in the details, e.g. 4.2 g." />
            {stones
              .filter((st) => stonesOf(piece).includes(st.id))
              .map((st) => (
                <NumberField
                  key={st.id}
                  label={`${show(st.label)}, total carats`}
                  value={piece.stone_carats?.[st.id] ?? null}
                  step={0.01}
                  onChange={(v) => {
                    const next = { ...(piece.stone_carats ?? {}) };
                    if (v == null) delete next[st.id];
                    else next[st.id] = v;
                    set({ stone_carats: next });
                  }}
                />
              ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Toggle label="Visible on the site" checked={piece.visible} onChange={(v) => set({ visible: v })} />
            <Toggle label="Show on the homepage" checked={piece.featured} onChange={(v) => set({ featured: v })} hint="In the “Selected pieces” block, when it is switched on." />
          </div>
        </Card>

        <Card title={SHOP_LIVE ? 'Price and stock' : 'Price'}>
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="Price in euro, VAT included" value={piece.price} onChange={(v) => set({ price: v })} step={0.01} />
            <div className="space-y-2 pt-5">
              <Toggle label="Show the price" checked={piece.show_price} onChange={(v) => set({ show_price: v })} hint="Off: the site says “Price on request”." />
              {SHOP_LIVE ? (
                <Toggle label="Can be bought online" checked={piece.for_sale} onChange={(v) => set({ for_sale: v })} hint="Off: only “Book a viewing”." />
              ) : (
                <Toggle
                  label="Sold"
                  checked={variants.length ? sizeStock === 0 : piece.stock === 0}
                  onChange={(v) => {
                    set({ stock: v ? 0 : 1 });
                    setVariants(variants.map((x) => ({ ...x, stock: v ? 0 : 1 })));
                  }}
                  hint="The piece stays on the site, marked “Sold”."
                />
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-[var(--color-line)] pt-5">
            <p className="text-sm">Sizes</p>
            <p className="mb-3 text-xs text-[var(--color-stone)]">
              {SHOP_LIVE
                ? 'For rings (or chain lengths). Each size has its own stock. Without sizes, the stock below is used. Visitors can filter the collection by size.'
                : 'For rings (or chain lengths). Visitors can filter the collection by these sizes.'}
            </p>
            {variants.length > 0 && (
              <ul className="mb-3 space-y-2">
                {variants.map((v, i) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-2">
                    <input value={v.label} onChange={(e) => setVariants(variants.map((x) => (x.id === v.id ? { ...x, label: e.target.value } : x)))} className={`${inputCls} !mt-0 w-24`} aria-label="Size" />
                    {SHOP_LIVE && (
                      <label className="flex items-center gap-2 text-sm">
                        in stock
                        <input type="number" min={0} value={v.stock} onChange={(e) => setVariants(variants.map((x) => (x.id === v.id ? { ...x, stock: Number(e.target.value) } : x)))} className={`${inputCls} !mt-0 w-20`} />
                      </label>
                    )}
                    <UpDown index={i} count={variants.length} onMove={(d) => setVariants(move(variants, i, d))} />
                    <button
                      type="button"
                      onClick={() => {
                        if (!v.isNew) removed.current.variants.push(v.id);
                        setVariants(variants.filter((x) => x.id !== v.id));
                      }}
                      className="text-xs text-red-800 underline underline-offset-2"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setVariants([...variants, { id: crypto.randomUUID(), label: '', stock: 1, position: variants.length, isNew: true }])}>Add a size</Button>
              {variants.length === 0 && (
                <Button onClick={() => setVariants(RING_SIZES.map((label, position) => ({ id: crypto.randomUUID(), label, stock: SHOP_LIVE ? 0 : 1, position, isNew: true })))}>Add ring sizes 48 to 60</Button>
              )}
            </div>
            {SHOP_LIVE &&
              (variants.length > 0 ? (
                <p className="mt-3 text-sm text-[var(--color-stone)]">Total in stock: {sizeStock}</p>
              ) : (
                <div className="mt-4 max-w-40">
                  <NumberField label="In stock" value={piece.stock} onChange={(v) => set({ stock: v ?? 0 })} />
                </div>
              ))}
          </div>
        </Card>

        <Card title="Search engines and address">
          <div className="grid gap-5">
            <AddressField
              prefix="58diamonds.com/en/piece/"
              slug={autoAddr ? slugify(show(piece.title)) : piece.slug}
              auto={autoAddr}
              onChange={(v) => set({ slug: v })}
              onAuto={(on) => {
                if (!on) set({ slug: slugify(show(piece.title)) || piece.slug });
                setAutoAddr(on);
              }}
            />
            <L10nField label="Title in Google (optional)" value={piece.seo_title} onChange={(v) => set({ seo_title: v })} hint="Leave empty to use the name." />
            <L10nField label="Description in Google (optional)" value={piece.seo_description} onChange={(v) => set({ seo_description: v })} multiline rows={2} hint="About 150 characters. Leave empty to use the start of the story." />
            <label className="block max-w-56">
              <span className="text-sm">Date (for sorting by newest)</span>
              <input
                type="date"
                value={piece.published_at.slice(0, 10)}
                onChange={(e) => e.target.value && set({ published_at: new Date(`${e.target.value}T12:00:00Z`).toISOString() })}
                className={inputCls}
              />
            </label>
          </div>
        </Card>
      </div>

      <SaveBar state={state} onSave={save}>
        <Button tone="danger" onClick={remove}>
          {isNew ? 'Cancel' : 'Delete'}
        </Button>
      </SaveBar>
    </div>
  );
}

/**
 * The piece's stones: a drop-down of tick boxes, since a piece can have
 * several, with a box at the bottom to add a stone that is not in the list.
 */
function StonePicker({
  stones,
  value,
  onChange,
  onAdded,
}: {
  stones: Attribute[];
  value: string[];
  onChange: (ids: string[]) => void;
  onAdded: (a: Attribute) => void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const chosen = stones.filter((s) => value.includes(s.id));

  async function add() {
    const label = name.trim();
    if (!label) return;
    const existing = stones.find((s) => show(s.label).toLowerCase() === label.toLowerCase());
    if (existing) {
      if (!value.includes(existing.id)) onChange([...value, existing.id]);
      return setName('');
    }
    setBusy(true);
    const { data, error } = await getAdminDb()
      .from('attributes')
      .insert({ kind: 'stone', slug: slugify(label) || `stone-${Date.now().toString(36)}`, label: { en: label }, position: stones.length })
      .select('*')
      .single();
    setBusy(false);
    if (error || !data) return window.alert(error?.message ?? 'Could not add the stone.');
    onAdded(data as Attribute);
    onChange([...value, (data as Attribute).id]);
    setName('');
  }

  return (
    <div>
      <span className="text-sm">Stones (filter)</span>
      <details className="group relative mt-1">
        <summary className={`${inputCls} !mt-0 cursor-pointer list-none truncate`}>{chosen.length ? chosen.map((s) => show(s.label)).join(', ') : '-'}</summary>
        <div className="absolute z-10 mt-1 w-full min-w-56 border border-[var(--color-line)] bg-white p-3 shadow-sm">
          <ul className="space-y-1">
            {stones.map((s) => (
              <li key={s.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={value.includes(s.id)}
                    onChange={(e) => onChange(e.target.checked ? stones.filter((x) => x.id === s.id || value.includes(x.id)).map((x) => x.id) : value.filter((id) => id !== s.id))}
                  />
                  {show(s.label)}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2 border-t border-[var(--color-line)] pt-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="New stone, e.g. Tanzanite"
              aria-label="New stone"
              className={`${inputCls} !mt-0 !py-1.5 text-sm`}
            />
            <Button onClick={add} disabled={busy || !name.trim()}>
              Add
            </Button>
          </div>
          <p className="mt-2 text-xs text-[var(--color-stone)]">Translations and the longer name are in Sections &gt; Stones.</p>
        </div>
      </details>
    </div>
  );
}

/** An unsaved piece: hidden, price on request, until Farah saves and shows it. */
function blankPiece(section_id: string | null): Piece {
  return {
    id: crypto.randomUUID(),
    section_id,
    slug: '',
    title: {},
    description: {},
    details: {},
    price: null,
    show_price: false,
    for_sale: true,
    stock: 1,
    metal_id: null,
    stone_id: null,
    stone_ids: [],
    karat: null,
    weight_g: null,
    stone_carats: {},
    visible: false,
    featured: false,
    position: 0,
    seo_title: {},
    seo_description: {},
    published_at: new Date().toISOString(),
    piece_images: [],
    piece_variants: [],
  };
}
