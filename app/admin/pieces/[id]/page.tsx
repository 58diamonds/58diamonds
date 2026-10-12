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
import { isPlaceholderSlug } from '@/lib/slug';
import { slugify } from '@/lib/format';
import { getAdminDb } from '@/lib/supabase';
import type { Attribute, Piece, PieceImage, PieceVariant, Section } from '@/lib/types';

const RING_SIZES = ['48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60'];
type Img = Omit<PieceImage, 'piece_id'> & { isNew?: boolean };
type Var = Omit<PieceVariant, 'piece_id'> & { isNew?: boolean };

export default function PieceEditor() {
  const { id } = useParams<{ id: string }>();
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
        db.from('pieces').select('*, piece_images(*), piece_variants(*)').eq('id', id).maybeSingle(),
        db.from('sections').select('*').order('position'),
        db.from('attributes').select('*').order('position'),
      ]);
      if (!p.data) return router.replace('/admin/pieces');
      const row = p.data as Piece;
      setPiece({ ...row, price: row.price == null ? null : Number(row.price) });
      setAutoAddr(isPlaceholderSlug(row.slug) || (!row.visible && row.slug === slugify(row.title.en ?? '')));
      setImages([...row.piece_images].sort((x, y) => x.position - y.position));
      setVariants([...row.piece_variants].sort((x, y) => x.position - y.position));
      setSections((s.data ?? []) as Section[]);
      setAttrs((a.data ?? []) as Attribute[]);
    })();
  }, [db, id, router]);

  if (!piece) return <Loading />;
  const set = (patch: Partial<Piece>) => setPiece((p) => (p ? { ...p, ...patch } : p));

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const url = await uploadImage(f, `pieces/${id}`);
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
      const { error } = await db
        .from('pieces')
        .update({
          slug,
          title: p.title,
          description: p.description,
          details: p.details,
          section_id: p.section_id,
          metal_id: p.metal_id,
          stone_id: p.stone_id,
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
        })
        .eq('id', p.id);
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
    if (ok) {
      set({ slug });
      setImages((xs) => xs.map((x) => ({ ...x, isNew: false })));
      setVariants((xs) => xs.filter((v) => v.label.trim()).map((x) => ({ ...x, isNew: false })));
    }
  }

  async function remove() {
    if (!window.confirm('Delete this piece for good? Orders that contain it keep their copy of its name and price.')) return;
    await db.from('pieces').delete().eq('id', piece!.id);
    publish();
    router.replace('/admin/pieces');
  }

  const metals = attrs.filter((a) => a.kind === 'metal');
  const stones = attrs.filter((a) => a.kind === 'stone');
  const sizeStock = variants.reduce((s, v) => s + (v.stock || 0), 0);

  return (
    <div>
      <PageTitle title={show(piece.title) || 'Piece'} back={{ href: '/admin/pieces', label: 'Pieces' }}>
        <a href={`/en/piece/${piece.slug}`} target="_blank" rel="noreferrer" className="self-center text-xs uppercase tracking-[0.16em] underline underline-offset-4">
          View on site ↗
        </a>
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
            <SelectField label="Metal (filter)" value={piece.metal_id ?? ''} onChange={(v) => set({ metal_id: v || null })} options={[{ value: '', label: '-' }, ...metals.map((m) => ({ value: m.id, label: show(m.label) }))]} />
            <SelectField label="Stone (filter)" value={piece.stone_id ?? ''} onChange={(v) => set({ stone_id: v || null })} options={[{ value: '', label: '-' }, ...stones.map((m) => ({ value: m.id, label: show(m.label) }))]} />
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
          Delete
        </Button>
      </SaveBar>
    </div>
  );
}
