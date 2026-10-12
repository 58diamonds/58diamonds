'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, Help, ImageField, Loading, PageTitle, SaveBar, SelectField, UpDown, show, useSave } from '@/components/admin/ui';
import { move } from '@/lib/admin-client';
import { getAdminDb } from '@/lib/supabase';
import type { HeaderLogo, HomeBlock, HomeTile, Section, Settings } from '@/lib/types';

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
  { value: 'brown-gold', label: 'Brown and gold', src: '/brand/logo-brown-gold.svg' },
];

/** The homepage: the logo on top, its photos, the squares, which blocks show and in which order. */
export default function HomeAdmin() {
  const db = getAdminDb();
  const [s, setS] = useState<Settings | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const { state, run } = useSave();

  useEffect(() => {
    db.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setS(data as Settings));
    db.from('sections').select('*').order('position').then(({ data }) => setSections((data ?? []) as Section[]));
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
            <ImageField label="Big photo at the top" value={s.hero_image_url} onChange={(v) => setS({ ...s, hero_image_url: v })} folder="home" aspect="aspect-[3/2]" hint="Landscape, at least 2400 px wide. Keep the jewelry in the middle: phones show a narrower, taller part." />
            <ImageField label="About Farah" value={s.about_image_url} onChange={(v) => setS({ ...s, about_image_url: v })} folder="home" aspect="aspect-[9/14]" />
          </div>
        </Card>

        <Card title="Squares">
          <Help>Up to six square photos under the heading. Each opens a section of the collection, whose name shows under the photo.</Help>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map((tile, i) => (
              <li key={i} className="border border-[var(--color-line)] p-4">
                <ImageField label={`Square ${i + 1}`} value={tile.image_url} onChange={(image_url) => setTile(i, { image_url })} folder="home" aspect="aspect-square" />
                <div className="mt-3">
                  <SelectField
                    label="Opens"
                    value={tile.section_id ?? ''}
                    onChange={(v) => setTile(i, { section_id: v || null })}
                    options={[{ value: '', label: 'The whole collection' }, ...sections.map((x) => ({ value: x.id, label: show(x.name) }))]}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <UpDown index={i} count={tiles.length} onMove={(d) => setTiles(move(tiles, i, d))} />
                  <Button tone="danger" onClick={() => setTiles(tiles.filter((_, j) => j !== i))}>Remove square</Button>
                </div>
              </li>
            ))}
          </ul>
          {tiles.length < 6 && (
            <div className="mt-4">
              <Button onClick={() => setTiles([...tiles, { image_url: null, section_id: sections[0]?.id ?? null }])}>Add a square</Button>
            </div>
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
        onSave={() => run(async () => db.from('settings').update({ home_blocks: shown, home_tiles: tiles.filter((x) => x.image_url), header_logo: s.header_logo, hero_image_url: s.hero_image_url, about_image_url: s.about_image_url, updated_at: new Date().toISOString() }).eq('id', 1))}
      />
    </div>
  );
}
