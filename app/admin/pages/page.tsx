'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Button, Help, Loading, PageTitle, show } from '@/components/admin/ui';
import { useNewFromLink } from '@/lib/admin-client';
import { getAdminDb } from '@/lib/supabase';
import type { MenuItem, Page } from '@/lib/types';

const LEGAL = ['terms', 'returns', 'privacy', 'cookies', 'withdrawal'];

/** Her own pages: About, the legal pages, and any page she adds. */
export default function PagesAdmin() {
  const db = getAdminDb();
  const router = useRouter();
  const [pages, setPages] = useState<Page[] | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);

  useEffect(() => {
    Promise.all([db.from('pages').select('*').order('slug'), db.from('menu_items').select('*')]).then(([p, m]) => {
      setPages((p.data ?? []) as Page[]);
      setMenu((m.data ?? []) as MenuItem[]);
    });
  }, [db]);

  async function create() {
    const slug = `new-page-${Date.now().toString(36)}`;
    const { data, error } = await db.from('pages').insert({ slug, title: { en: 'New page' }, published: false }).select('id').single();
    if (error) return window.alert(error.message);
    router.push(`/admin/pages/${data.id}`);
  }

  useNewFromLink(create, Boolean(pages));
  if (!pages) return <Loading />;
  const own = pages.filter((p) => !LEGAL.includes(p.slug));
  const legal = pages.filter((p) => LEGAL.includes(p.slug));
  const where = (p: Page) => {
    const m = menu.filter((i) => i.kind === 'page' && i.page_id === p.id && i.visible).map((i) => i.menu);
    return [m.includes('header') && 'Top menu', m.includes('footer') && 'Footer'].filter(Boolean).join(', ');
  };

  const list = (rows: Page[]) => (
    <ul className="mb-10 divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-white">
      {rows.map((p) => (
        <li key={p.id}>
          <Link href={`/admin/pages/${p.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-[var(--color-pearl)]">
            <span className="font-display flex-1 text-xl">{show(p.title) || p.slug}</span>
            <span className="text-xs text-[var(--color-stone)]">/{p.slug}</span>
            {where(p) ? <Badge>{where(p)}</Badge> : <Badge tone="warn">Not in a menu</Badge>}
            {!p.published && <Badge tone="dark">Draft</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <PageTitle title="Pages">
        <Button tone="dark" onClick={create}>New page</Button>
      </PageTitle>
      <Help>
        Pages with your own text and photo. A new page starts as a draft: write it, switch on “Published”, then add it to a menu from its page or under Menus.
      </Help>
      {list(own)}
      <h2 className="eyebrow mb-3">Legal pages</h2>
      <Help>Filled in with your company details from Settings. Have them read by your accountant or lawyer before the shop opens.</Help>
      {list(legal)}
    </div>
  );
}
