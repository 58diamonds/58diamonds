'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/admin/ui';
import { useAdminRole } from '@/components/admin/AdminShell';
import { getAdminDb } from '@/lib/supabase';

type Counts = { today: number; yesterday: number; week: number; month: number; days: { day: string; visitors: number }[] };

/**
 * Unique visitors on the public site (see lib/visitors.ts): different people,
 * so someone who opens ten pages or comes back the same day counts once.
 * Owners and admins only.
 */
export function VisitorsCard({ className = '' }: { className?: string }) {
  const role = useAdminRole();
  const allowed = role === 'owner' || role === 'admin';
  const [counts, setCounts] = useState<Counts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    getAdminDb().rpc('visitor_counts').then(({ data, error }) => (error ? setFailed(true) : setCounts(data as Counts)));
  }, [allowed]);

  if (!allowed) return null;

  // The last 30 days, oldest first, with 0 for days nobody came.
  const byDay = new Map((counts?.days ?? []).map((d) => [d.day, d.visitors]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    const key = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' });
    return { key, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), visitors: byDay.get(key) ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.visitors));

  return (
    <Card title="Visitors" className={className}>
      {failed ? (
        <p className="text-sm text-[var(--color-stone)]">The visitor counter is not set up yet.</p>
      ) : !counts ? (
        <p className="text-sm text-[var(--color-stone)]">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {([
              ['Today', counts.today],
              ['Yesterday', counts.yesterday],
              ['Last 7 days', counts.week],
              ['Last 30 days', counts.month],
            ] as const).map(([label, value]) => (
              <div key={label}>
                <p className="eyebrow">{label}</p>
                <p className="font-display mt-1 text-3xl">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex h-16 items-end gap-[2px]" aria-label="Visitors per day, last 30 days">
            {days.map((d) => (
              <div key={d.key} title={`${d.label}: ${d.visitors}`} className="flex-1 bg-[var(--color-gold)] opacity-80" style={{ height: `${Math.max(2, (d.visitors / max) * 100)}%` }} />
            ))}
          </div>
          <p className="mt-3 text-sm text-[var(--color-stone)]">Different people on the website, each counted once per period. Bots are left out. No IP addresses are stored.</p>
        </>
      )}
    </Card>
  );
}
