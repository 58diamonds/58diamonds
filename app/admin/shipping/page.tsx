'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Help, Loading, NumberField, PageTitle, SaveBar, inputCls, useSave } from '@/components/admin/ui';
import { formatPrice } from '@/lib/format';
import { COUNTRY_NAMES, DEFAULT_EU_RATE, EU_COUNTRIES, rateCost, shippingCountries, type ShippingRate, type ShippingRates } from '@/lib/shipping';
import { getAdminDb } from '@/lib/supabase';

const byName = (a: string, b: string) => COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b]);
const EU = [...EU_COUNTRIES].sort(byName);
const OTHERS = Object.keys(COUNTRY_NAMES).filter((c) => !EU_COUNTRIES.includes(c)).sort(byName);
const EXAMPLES = [1000, 5000];
const money = (n: number) => formatPrice(n, 'EUR', 'en');

/**
 * Shipping per country: a percentage of the pieces' value plus a fixed
 * amount, rounded up. Only countries with a price can be chosen in the bag.
 * Nothing is stored until Save.
 */
export default function ShippingAdmin() {
  const db = getAdminDb();
  const [rates, setRates] = useState<ShippingRates | null>(null);
  const [freeFrom, setFreeFrom] = useState<number | null>(null);
  const [all, setAll] = useState<ShippingRate>(DEFAULT_EU_RATE);
  const { state, run, setState } = useSave();

  function load() {
    db.from('settings').select('shipping_rates, free_shipping_from').eq('id', 1).maybeSingle().then(({ data }) => {
      setRates((data?.shipping_rates as ShippingRates) ?? {});
      setFreeFrom(data?.free_shipping_from == null ? null : Number(data.free_shipping_from));
    });
  }
  useEffect(load, [db]);

  if (!rates) return <Loading />;

  const setRate = (c: string, rate: ShippingRate | null) => {
    const { [c]: _, ...rest } = rates;
    setRates(rate ? { ...rest, [c]: rate } : rest);
  };

  async function save() {
    const clean = Object.fromEntries(
      Object.entries(rates!).map(([c, r]) => [c, { percent: Number(r.percent) || 0, fixed: Number(r.fixed) || 0, round_to: Number(r.round_to) || 0 }]),
    );
    if (!Object.keys(clean).length) return setState({ error: 'Give at least one country a shipping price.' });
    await run(async () =>
      db
        .from('settings')
        .update({ shipping_rates: clean, ship_to: shippingCountries(clean), free_shipping_from: freeFrom, updated_at: new Date().toISOString() })
        .eq('id', 1),
    );
  }

  const row = (c: string) => {
    const r = rates[c];
    const num = (key: keyof ShippingRate, label: string, step: number) => (
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        aria-label={`${COUNTRY_NAMES[c]}: ${label}`}
        value={r ? r[key] : ''}
        onChange={(e) => r && setRate(c, { ...r, [key]: e.target.value === '' ? 0 : Number(e.target.value) })}
        disabled={!r}
        className={`${inputCls} !mt-0 w-full min-w-[3.5rem] max-w-28 !px-2 text-sm disabled:opacity-40`}
      />
    );
    return (
      <tr key={c} className="border-t border-[var(--color-line)]">
        <td className="py-2 pr-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(r)} onChange={(e) => setRate(c, e.target.checked ? { ...all } : null)} className="h-4 w-4 accent-[var(--color-ink)]" />
            {COUNTRY_NAMES[c]}
          </label>
        </td>
        <td className="py-2 pr-2">{num('percent', '% of the value', 0.1)}</td>
        <td className="py-2 pr-2">{num('fixed', 'plus euros', 1)}</td>
        <td className="py-2 pr-2">{num('round_to', 'round up to', 1)}</td>
        <td className="hidden py-2 text-right text-sm text-[var(--color-stone)] sm:table-cell">
          {r ? EXAMPLES.map((v) => money(rateCost(v, r))).join(' · ') : 'Not shipped'}
        </td>
      </tr>
    );
  };

  const table = (title: string, codes: string[]) => (
    <Card title={title}>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[0.65rem] uppercase tracking-[0.16em] text-[var(--color-stone)]">
              <th className="pb-2 font-normal">Ships to</th>
              <th className="pb-2 font-normal">% of value</th>
              <th className="pb-2 font-normal">+ €</th>
              <th className="pb-2 font-normal">Round up to €</th>
              <th className="hidden pb-2 text-right font-normal sm:table-cell">For {EXAMPLES.map(money).join(' · ')}</th>
            </tr>
          </thead>
          <tbody>{codes.map(row)}</tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div>
      <PageTitle title="Shipping" />
      <Help>
        Insured, tracked shipping, charged once per order. Per country: a percentage of the pieces&apos; value (VAT included, gift wrap left out), plus a
        fixed amount, rounded up. Example: 1% + €50, rounded up to €5, makes €60 for a €1,000 ring and €125 for a €7,500 one. In the bag the client first picks the delivery country;
        only ticked countries can be chosen.
      </Help>

      <div className="grid gap-6">
        <Card title="Fill the whole EU">
          <div className="grid items-end gap-4 sm:grid-cols-4">
            <NumberField label="% of the value" value={all.percent} onChange={(v) => setAll({ ...all, percent: v ?? 0 })} step={0.1} />
            <NumberField label="Plus (€)" value={all.fixed} onChange={(v) => setAll({ ...all, fixed: v ?? 0 })} />
            <NumberField label="Round up to (€)" value={all.round_to} onChange={(v) => setAll({ ...all, round_to: v ?? 0 })} hint="0: to the cent." />
            <Button onClick={() => setRates({ ...rates, ...Object.fromEntries(EU_COUNTRIES.map((c) => [c, { ...all }])) })}>Apply to all EU countries</Button>
          </div>
          <div className="mt-5 max-w-xs">
            <NumberField label="Free shipping from (€)" value={freeFrom} onChange={setFreeFrom} hint="Empty: never free." />
          </div>
        </Card>

        {table('European Union', EU)}
        {table('Outside the EU', OTHERS)}
      </div>

      <SaveBar state={state} onSave={save} onCancel={load} />
    </div>
  );
}
