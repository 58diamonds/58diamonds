'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, Help, ImageField, Loading, PageTitle, SaveBar, UpDown, show, useSave } from '@/components/admin/ui';
import { move } from '@/lib/admin-client';
import { wornPhoto } from '@/lib/piece-view';
import { getAdminDb } from '@/lib/supabase';
import type { HeaderLogo, HomeBlock, HomeTile, Piece, Section, Settings } from '@/lib/types';

const BLOCKS: Record<HomeBlock, { name: string; about: string }> = {
  tiles: { name: 'Squares', about: 'The heading and the photo squares that open a section of the collection.' },
  house: { name: 'The house', about: 'Heading and three short texts (made to order, certified stones, appointments).' },
  story: { name: 'About Farah', about: 'Photo, the start of her story and a link to the About page.' },
  featured: { name: 'Selected pieces', about: 'The pieces marked “Show on the homepage”.' },
  sections: { name: 'Section tiles', about: 'One photo per collection section.' },
  events: { name: 'Upcoming events', about: 'Shows only when an event is coming up.' },
  instagram: { name: 'Instagram', about: 'The latest posts.' },
  newsletter: { name: 'Newsletter signup', about: 'Email signup for private news.' },
  contact: { name: 'Book an appointment', about: 'Address, Instagram and the appointment button.' },
};

const LOGOS: { value: HeaderLogo; label: string; src: string }[] = [
  { value: 'ink', label: 'As it is', src: '/brand/logo-ink.svg' },
  { value: 'black', label: 'Black', src: '/brand/logo-black.svg' },
  { value: 'brown-gold', label: 'Gold', src: '/brand/logo-brown-gold.svg' },
];

/** The homepage: the logo on top, its photos, the squares, which blocks show and in which order. */
export default function HomeAdmin() {
  const db = getAdminDb();
  const [s, setS] = useState<Settings | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [pieces, setPieces] = useState<TilePiece[]>([]);
  const [picking, setPicking] = useState<number | null>(null);
  const { state, run } = useSave();

  useEffect(() => {
    db.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setS(data as Settings));
    db.from('sections').select('*').order('position').then(({ data }) => setSections((data ?? []) as Section[]));
    db.from('pieces')
      .select('id, title, section_id, piece_images(url, position, worn)')
      .order('position')
      .then(({ data }) =>
        setPieces(
          ((data ?? []) as TilePiece[]).map((p) => ({ ...p, piece_images: [...(p.piece_images ?? [])].sort((a, b) => a.position - b.position) })),
        ),
      );
  }, [db]);
  if (!s) return <Loading />;
  const tiles = s.home_tiles ?? [];
  const setTiles = (home_tiles: HomeTile[]) => setS({ ...s, home_tiles });
  const setTile = (i: number, patch: Partial<HomeTile>) => setTiles(tiles.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const all = Object.keys(BLOCKS) as HomeBlock[];
  const shown = s.home_blocks.filter((b) => all.includes(b));
  const hidden = all.filter((b) => !shown.includes(b));
  const setBlocks = (home_blocks: HomeBlock[]) => setS({ ...s, home_blocks });

  return (
    <div>
      <PageTitle title="Homepage" />
      <Help>
        The big photo at the top always comes first. Below it, choose which blocks show and in which order. The wording of every block is under{' '}
        <Link href="/admin/texts?group=Homepage" className="underline underline-offset-4">Texts › Homepage</Link>.
      </Help>

      <div className="grid gap-6">
        <Card title="Logo in the header">
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Logo in the header">
            {LOGOS.map((l) => (
              <button
                key={l.value}
                type="button"
                role="radio"
                aria-checked={s.header_logo === l.value}
                onClick={() => setS({ ...s, header_logo: l.value })}
                className={`border p-4 text-center transition ${s.header_logo === l.value ? 'border-[var(--color-gold)] bg-[var(--color-ivory)]' : 'border-[var(--color-line)] hover:border-[var(--color-gold-soft)]'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.src} alt="" className="mx-auto h-14 w-auto" />
                <span className="label mt-3 block">{l.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Photos">
          <div className="flex flex-wrap gap-10">
            <ImageField label="Big photo at the top" value={s.hero_image_url} onChange={(v) => setS({ ...s, hero_image_url: v })} folder="home" aspect="aspect-[3/2]" hint="Landscape, at least 2400 px wide. Keep the jewellery in the middle: phones show a narrower, taller part." />
            <ImageField label="About Farah" value={s.about_image_url} onChange={(v) => setS({ ...s, about_image_url: v })} folder="home" aspect="aspect-[9/14]" />
          </div>
        </Card>

        <Card title="Squares">
          <Help>
            Up to six squares under the heading, each one a piece from the collection. The name under the square is the piece&apos;s name, and a click opens its
            part of the collection (a ring opens Rings). The photo is one of the piece&apos;s own photos, the worn photo first when the piece has one; to show another one, add it to the piece first.
          </Help>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map((tile, i) => {
              const piece = pieces.find((x) => x.id === tile.piece_id);
              const sec = sections.find((y) => y.id === (piece?.section_id ?? tile.section_id));
              const photos = piece?.piece_images.map((im) => im.url) ?? [];
              // Squares made before this kept their own photo; it stays until another is picked.
              const choices = tile.image_url && !photos.includes(tile.image_url) ? [tile.image_url, ...photos] : photos;
              const current = tile.image_url ?? (piece && (wornPhoto(piece.piece_images) ?? piece.piece_images[0])?.url) ?? null;
              return (
                <li key={i} className="border border-[var(--color-line)] p-4">
                  <p className="label mb-2">Square {i + 1}</p>
                  <div className="aspect-square overflow-hidden bg-white">
                    {current ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={current} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-sm text-[var(--color-stone)]">No piece yet</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm">
                    {piece ? show(piece.title) : 'No piece chosen'}
                    {sec && <span className="text-[var(--color-stone)]"> · opens {show(sec.name)}</span>}
                  </p>
                  {choices.length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Photo">
                      {choices.map((url) => (
                        <button
                          key={url}
                          type="button"
                          role="radio"
                          aria-checked={url === current}
                          onClick={() => setTile(i, { image_url: url })}
                          className={`h-12 w-12 overflow-hidden border bg-white ${url === current ? 'border-[var(--color-gold)]' : 'border-[var(--color-line)]'}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button onClick={() => setPicking(picking === i ? null : i)}>{piece ? 'Change piece' : 'Choose a piece'}</Button>
                    <UpDown index={i} count={tiles.length} onMove={(d) => setTiles(move(tiles, i, d))} />
                    <Button tone="danger" onClick={() => setTiles(tiles.filter((_, j) => j !== i))}>Remove</Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {tiles.length < 6 && (
            <div className="mt-4">
              <Button
                onClick={() => {
                  setTiles([...tiles, { image_url: null, section_id: null, piece_id: null }]);
                  setPicking(tiles.length);
                }}
              >
                Add a square
              </Button>
            </div>
          )}
          {picking != null && tiles[picking] && (
            <PiecePicker
              pieces={pieces}
              sections={sections}
              title={`Choose the piece for square ${picking + 1}`}
              onClose={() => setPicking(null)}
              onPick={(p) => {
                setTile(picking, { piece_id: p.id, section_id: p.section_id, image_url: (wornPhoto(p.piece_images) ?? p.piece_images[0])?.url ?? null });
                setPicking(null);
              }}
            />
          )}
        </Card>

        <Card title="Blocks, top to bottom">
          <ul className="divide-y divide-[var(--color-line)]">
            {shown.map((b, i) => (
              <li key={b} className="flex items-center gap-4 py-3">
                <span className="flex-1">
                  <span className="block">{BLOCKS[b].name}</span>
                  <span className="text-xs text-[var(--color-stone)]">{BLOCKS[b].about}</span>
                </span>
                <Button onClick={() => setBlocks(shown.filter((x) => x !== b))}>Hide</Button>
                <UpDown index={i} count={shown.length} onMove={(d) => setBlocks(move(shown, i, d))} />
              </li>
            ))}
          </ul>
          {hidden.length > 0 && (
            <div className="mt-5 border-t border-[var(--color-line)] pt-4">
              <p className="mb-2 text-sm text-[var(--color-stone)]">Hidden</p>
              <ul className="space-y-2">
                {hidden.map((b) => (
                  <li key={b} className="flex items-center gap-3">
                    <Badge>Hidden</Badge>
                    <span className="flex-1 text-sm">{BLOCKS[b].name}</span>
                    <Button onClick={() => setBlocks([...shown, b])}>Show</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <SaveBar
        state={state}
        onSave={() => run(async () => db.from('settings').update({ home_blocks: shown, home_tiles: tiles.filter((x) => x.image_url || x.piece_id), header_logo: s.header_logo, hero_image_url: s.hero_image_url, about_image_url: s.about_image_url, updated_at: new Date().toISOString() }).eq('id', 1))}
      />
    </div>
  );
}

type TilePiece = Pick<Piece, 'id' | 'title' | 'section_id'> & { piece_images: { url: string; position: number; worn: boolean }[] };

/** The collection as photos, by section, to pick the piece for a square. */
function PiecePicker({
  pieces,
  sections,
  title,
  onPick,
  onClose,
}: {
  pieces: TilePiece[];
  sections: Section[];
  title: string;
  onPick: (p: TilePiece) => void;
  onClose: () => void;
}) {
  const [section, setSection] = useState<string>('');
  const shown = section ? pieces.filter((p) => p.section_id === section) : pieces;
  return (
    <div className="mt-6 border border-[var(--color-gold-soft)] bg-[var(--color-ivory)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">{title}</p>
        <Button onClick={onClose}>Cancel</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="chip" aria-pressed={section === ''} onClick={() => setSection('')}>
          All
        </button>
        {sections.map((x) => (
          <button key={x.id} type="button" className="chip" aria-pressed={section === x.id} onClick={() => setSection(x.id)}>
            {show(x.name)}
          </button>
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {shown.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p)} className="group block w-full text-left">
              <span className="block aspect-square overflow-hidden border border-[var(--color-line)] bg-white group-hover:border-[var(--color-gold)]">
                {p.piece_images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.piece_images[0].url} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="mt-1 block text-xs">{show(p.title)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
