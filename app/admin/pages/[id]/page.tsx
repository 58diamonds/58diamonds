'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddressField, Card, DeleteZone, ImageField, L10nField, Loading, MARKDOWN_HINT, PageTitle, SaveBar, TextField, Toggle, show, useSave } from '@/components/admin/ui';
import { freeSlug, publish } from '@/lib/admin-client';
import { slugify } from '@/lib/format';
import { isPlaceholderSlug } from '@/lib/slug';
import { RESERVED_SLUGS } from '@/lib/routes';
import { SITE_URL } from '@/lib/config';
import { getAdminDb } from '@/lib/supabase';
import type { MenuItem, Page } from '@/lib/types';
import { askConfirm } from '@/components/admin/confirm';

const PLACEHOLDERS = '{company_name}, {legal_name}, {company_address}, {vat_number} and {email} are filled in from Settings.';

/** Edit one page: text, photo, address, search engine text, menus. */
export default function PageEditor() {
  const { id } = useParams<{ id: string }>();
  // "new": nothing is stored until the first Save.
  const isNew = id === 'new';
  const router = useRouter();
  const db = getAdminDb();
  const [page, setPage] = useState<Page | null>(null);
  // The address follows the name until the page is first published.
  const [autoAddr, setAutoAddr] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const { state, run, setState } = useSave();

  useEffect(() => {
    const blank = { data: { id: crypto.randomUUID(), slug: '', title: {}, body: {}, image_url: null, seo_title: {}, seo_description: {}, published: false } as Page };
    Promise.all([
      isNew ? Promise.resolve(blank) : db.from('pages').select('*').eq('id', id).maybeSingle(),
      isNew ? Promise.resolve({ data: [] }) : db.from('menu_items').select('*').eq('page_id', id),
    ]).then(([p, m]) => {
      if (!p.data) return router.replace('/pages');
      const row = p.data as Page;
      setPage(row);
      setAutoAddr(isPlaceholderSlug(row.slug) || (!row.published && row.slug === slugify(row.title.en ?? '')));
      setMenu((m.data ?? []) as MenuItem[]);
    });
  }, [db, id, isNew, router]);

  if (!page) return <Loading />;
  const set = (patch: Partial<Page>) => setPage({ ...page, ...patch });
  const slug = (autoAddr ? slugify(show(page.title)) : slugify(page.slug)) || slugify(show(page.title));
  const inMenu = (m: MenuItem['menu']) => menu.some((i) => i.menu === m);

  async function save() {
    if (!slug) return setState({ error: 'Give the page a web address.' });
    if (RESERVED_SLUGS.includes(slug)) return setState({ error: `“${slug}” is used by the site itself. Choose another web address.` });
    let free = slug;
    const ok = await run(async () => {
      free = await freeSlug('pages', slug, page!.id);
      const fields = {
          slug: free,
          title: page!.title,
          body: page!.body,
          image_url: page!.image_url,
          seo_title: page!.seo_title,
          seo_description: page!.seo_description,
          published: page!.published,
          updated_at: new Date().toISOString(),
      };
      return isNew ? db.from('pages').insert({ ...fields, id: page!.id }) : db.from('pages').update(fields).eq('id', id);
    });
    if (ok && isNew) return router.replace(`/pages/${page!.id}`);
    if (ok) set({ slug: free });
  }

  async function toggleMenu(m: MenuItem['menu'], on: boolean) {
    if (on) {
      const { count } = await db.from('menu_items').select('id', { count: 'exact', head: true }).eq('menu', m);
      const { data, error } = await db.from('menu_items').insert({ menu: m, kind: 'page', page_id: id, label: {}, position: count ?? 0, visible: true }).select('*').single();
      if (error) return setState({ error: error.message });
      setMenu([...menu, data as MenuItem]);
    } else {
      await db.from('menu_items').delete().eq('page_id', id).eq('menu', m);
      setMenu(menu.filter((i) => i.menu !== m));
    }
    publish();
  }

  async function remove() {
    if (isNew) return router.replace('/pages');
    if (!(await askConfirm(`Delete the page “${show(page!.title)}”? It also leaves the menus. This cannot be undone.`))) return;
    const { error } = await db.from('pages').delete().eq('id', id);
    if (error) return setState({ error: error.message });
    publish();
    router.replace('/pages');
  }

  return (
    <div>
      <PageTitle title={show(page.title) || (isNew ? 'New page' : 'Page')} back={{ href: '/pages', label: 'Pages' }}>
        {page.published && (
          <a href={`${SITE_URL}/en/${slug}`} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-4">
            View on the site
          </a>
        )}
      </PageTitle>

      <div className="grid gap-6">
        <Card title="Text">
          <div className="grid gap-5">
            <L10nField label="Title" value={page.title} onChange={(title) => set({ title })} />
            <L10nField label="Text" value={page.body} onChange={(body) => set({ body })} multiline rows={16} hint={`${MARKDOWN_HINT} ${PLACEHOLDERS}`} />
            <ImageField label="Photo (optional)" value={page.image_url} onChange={(image_url) => set({ image_url })} folder="pages" aspect="aspect-[4/3]" />
          </div>
        </Card>

        <Card title="On the site">
          <div className="grid gap-5">
            <Toggle label="Published" checked={page.published} onChange={(published) => set({ published })} hint="Off: only you can see it here; visitors get “page not found”." />
            <AddressField
              prefix="58diamonds.com/en/"
              slug={autoAddr ? slug : page.slug}
              auto={autoAddr}
              onChange={(v) => set({ slug: v })}
              onAuto={(on) => {
                if (!on) set({ slug });
                setAutoAddr(on);
              }}
            />
            {isNew ? (
              <p className="text-sm text-[var(--color-stone)]">Save the page first; then you can add it to the top menu or the footer.</p>
            ) : (
              <>
                <Toggle label="In the top menu" checked={inMenu('header')} onChange={(v) => toggleMenu('header', v)} />
                <Toggle label="In the footer" checked={inMenu('footer')} onChange={(v) => toggleMenu('footer', v)} />
              </>
            )}
          </div>
        </Card>

        <Card title="Search engines">
          <div className="grid gap-5">
            <L10nField label="Title in Google" value={page.seo_title} onChange={(seo_title) => set({ seo_title })} hint="Leave empty to use the page title. About 60 characters." />
            <L10nField
              label="Description in Google"
              value={page.seo_description}
              onChange={(seo_description) => set({ seo_description })}
              multiline
              rows={3}
              hint="One or two sentences, about 150 characters. Empty: the start of the text is used."
            />
          </div>
        </Card>
      </div>

      {!isNew && <DeleteZone label="Delete this page" onDelete={remove} />}
      <SaveBar state={state} onSave={save} back="/pages" />
    </div>
  );
}
