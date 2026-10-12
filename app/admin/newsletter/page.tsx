'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Help, Loading, PageTitle } from '@/components/admin/ui';
import { downloadCsv } from '@/lib/admin-client';
import { getAdminDb } from '@/lib/supabase';

interface Subscriber {
  id: string;
  email: string;
  locale: string;
  unsubscribed_at: string | null;
  created_at: string;
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '');

/** People who signed up for news on the website. */
export default function NewsletterAdmin() {
  const db = getAdminDb();
  const [subs, setSubs] = useState<Subscriber[] | null>(null);

  useEffect(() => {
    db.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }).then(({ data }) => setSubs((data ?? []) as Subscriber[]));
  }, [db]);
  if (!subs) return <Loading />;
  const active = subs.filter((s) => !s.unsubscribed_at);

  return (
    <div>
      <PageTitle title="Newsletter">
        <Button onClick={() => downloadCsv('58-diamonds-newsletter.csv', [['Email', 'Language', 'Signed up'], ...active.map((s) => [s.email, s.locale, day(s.created_at)])])}>
          Download list
        </Button>
      </PageTitle>
      <Help>
        {active.length} {active.length === 1 ? 'person' : 'people'} signed up for news. Download the list to send your news from your email program; those who
        unsubscribed are left out.
      </Help>
      <ul className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-white">
        {subs.map((s) => (
          <li key={s.id} className={`flex flex-wrap items-center gap-3 p-3 ${s.unsubscribed_at ? 'opacity-50' : ''}`}>
            <span className="flex-1">{s.email}</span>
            <span className="uppercase text-[var(--color-stone)]">{s.locale}</span>
            <span className="text-[var(--color-stone)]">{day(s.created_at)}</span>
            {s.unsubscribed_at && <Badge>Unsubscribed</Badge>}
          </li>
        ))}
        {subs.length === 0 && <li className="p-4 text-[var(--color-stone)]">No signups yet.</li>}
      </ul>
    </div>
  );
}
