/**
 * Writes supabase/seed.sql from the starting content in lib/demo.ts, so the
 * database starts with exactly what the preview shows. Run: npm run seed:sql
 */
import { writeFileSync } from 'node:fs';
import { DEMO_ATTRIBUTES, DEMO_MENU, DEMO_PAGES, DEMO_PIECES, DEMO_SECTIONS, DEMO_SETTINGS } from '../lib/demo';

function lit(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
  // An untyped array literal, so it fits text[] and uuid[] columns alike.
  if (Array.isArray(v)) return lit(`{${v.map((x) => JSON.stringify(String(x))).join(',')}}`);
  return `${lit(JSON.stringify(v))}::jsonb`;
}

function insert(table: string, cols: string[], rows: object[]): string {
  if (!rows.length) return '';
  const values = rows.map((r) => `  (${cols.map((c) => lit((r as Record<string, unknown>)[c])).join(', ')})`).join(',\n');
  return `insert into ${table} (${cols.join(', ')}) values\n${values}\non conflict do nothing;\n`;
}

const s = DEMO_SETTINGS;
const out = [
  '-- Starting content for a new database. Run once, after the migrations.',
  '-- Safe to re-run: existing rows are never changed or duplicated.',
  '-- Generated from lib/demo.ts by `npm run seed:sql`; edit that file, not this one.',
  '',
  `update settings set hero_image_url = ${lit(s.hero_image_url)}, about_image_url = ${lit(s.about_image_url)}, og_image_url = ${lit(s.og_image_url)}`,
  '  where id = 1 and hero_image_url is null;',
  `update settings set home_tiles = ${lit(JSON.stringify(s.home_tiles))}::jsonb`,
  "  where id = 1 and home_tiles = '[]'::jsonb;",
  `update settings set company_name = ${lit(s.company_name)}, company_address = ${lit(s.company_address)}, vat_number = ${lit(s.vat_number)}`,
  '  where id = 1 and company_name is null;',
  '',
  insert('sections', ['id', 'slug', 'name', 'description', 'cover_url', 'position', 'visible', 'show_prices'], DEMO_SECTIONS),
  insert('attributes', ['id', 'kind', 'slug', 'label', 'full_label', 'position'], DEMO_ATTRIBUTES),
  insert(
    'pieces',
    ['id', 'section_id', 'slug', 'title', 'description', 'details', 'price', 'show_price', 'for_sale', 'stock', 'metal_id', 'stone_id', 'stone_ids', 'visible', 'featured', 'position', 'seo_title', 'seo_description', 'published_at'],
    DEMO_PIECES,
  ),
  // The demo reuses image and size ids across pieces; the database needs one id per row.
  insert('piece_images', ['id', 'piece_id', 'url', 'alt', 'position', 'worn'], DEMO_PIECES.flatMap((p) => p.piece_images.map((i) => ({ ...i, id: rowId('1a6e0000', p.id, i.position) })))),
  insert('piece_variants', ['id', 'piece_id', 'label', 'stock', 'position'], DEMO_PIECES.flatMap((p) => p.piece_variants.map((v) => ({ ...v, id: rowId('fa770000', p.id, v.position) })))),
  insert('pages', ['id', 'slug', 'title', 'body', 'image_url', 'seo_title', 'seo_description', 'published'], DEMO_PAGES),
  insert('menu_items', ['id', 'menu', 'kind', 'target', 'page_id', 'section_id', 'url', 'label', 'position', 'visible'], DEMO_MENU),
].join('\n');

function rowId(prefix: string, pieceId: string, position: number) {
  return `${prefix}-0000-4000-8000-${pieceId.slice(-10)}${String(position).padStart(2, '0')}`;
}

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), out);
console.log('supabase/seed.sql written');
