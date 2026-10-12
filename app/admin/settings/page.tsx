'use client';

import Link from 'next/link';
import { SHOP_LIVE } from '@/lib/config';
import { useEffect, useState } from 'react';
import { Card, Help, ImageField, Loading, NumberField, PageTitle, SaveBar, TextField, Toggle, useSave } from '@/components/admin/ui';
import { getAdminDb } from '@/lib/supabase';
import type { Settings } from '@/lib/types';
import { EU_VAT_RATES, HOME_COUNTRY, OSS_THRESHOLD } from '@/lib/vat';

/** Countries she can ship to; Stripe asks for an address in one of these. */
const COUNTRIES: [string, string][] = [
  ['BE', 'Belgium'], ['NL', 'Netherlands'], ['LU', 'Luxembourg'], ['FR', 'France'], ['DE', 'Germany'],
  ['GB', 'United Kingdom'], ['CH', 'Switzerland'], ['IT', 'Italy'], ['ES', 'Spain'], ['PT', 'Portugal'],
  ['AT', 'Austria'], ['IE', 'Ireland'], ['DK', 'Denmark'], ['SE', 'Sweden'], ['NO', 'Norway'],
  ['MC', 'Monaco'], ['US', 'United States'], ['CA', 'Canada'], ['AE', 'United Arab Emirates'],
];

/** Contact details, shop switches, shipping, invoices, sharing image. */
export default function SettingsAdmin() {
  const db = getAdminDb();
  const [s, setS] = useState<Settings | null>(null);
  const { state, run, setState } = useSave();

  useEffect(() => {
    db.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (!data) return;
      const n = (v: unknown) => (v == null ? null : Number(v));
      setS({
        ...(data as Settings),
        shipping_flat: Number(data.shipping_flat),
        free_shipping_from: n(data.free_shipping_from),
        gift_wrap_price: Number(data.gift_wrap_price),
        vat_rate: Number(data.vat_rate),
        eu_vat_rates: data.eu_vat_rates ?? {},
      });
    });
  }, [db]);

  if (!s) return <Loading />;
  const set = (patch: Partial<Settings>) => setS({ ...s, ...patch });

  async function save() {
    const v = s!;
    if (SHOP_LIVE && !v.ship_to.length) return setState({ error: 'Choose at least one country to ship to.' });
    await run(async () =>
      db
        .from('settings')
        .update({
          email: v.email?.trim() || null,
          phone: v.phone?.trim() || null,
          whatsapp_number: v.whatsapp_number?.trim() || null,
          address: v.address?.trim() || null,
          instagram_handle: v.instagram_handle.replace(/^@/, '').trim(),
          shop_enabled: v.shop_enabled,
          wishlist_enabled: v.wishlist_enabled,
          newsletter_enabled: v.newsletter_enabled,
          shipping_flat: v.shipping_flat ?? 0,
          free_shipping_from: v.free_shipping_from,
          ship_to: v.ship_to,
          gift_wrap_enabled: v.gift_wrap_enabled,
          gift_wrap_price: v.gift_wrap_price ?? 0,
          company_name: v.company_name?.trim() || null,
          company_address: v.company_address?.trim() || null,
          vat_number: v.vat_number?.trim() || null,
          vat_rate: v.vat_rate ?? 21,
          ...(SHOP_LIVE ? { oss_registered: v.oss_registered, eu_vat_rates: v.eu_vat_rates } : {}),
          invoice_footer: v.invoice_footer?.trim() || null,
          og_image_url: v.og_image_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1),
    );
  }

  return (
    <div>
      <PageTitle title="Settings" />
      <Help>
        Events and Press are switched on and off on their own pages. Wording is under <Link href="/admin/texts" className="underline underline-offset-4">Texts</Link>.
      </Help>

      <div className="grid gap-6">
        <Card title="Contact">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Email" type="email" value={s.email ?? ''} onChange={(email) => set({ email })} hint={`Shown on the site. New ${SHOP_LIVE ? 'orders and ' : ''}requests are sent here.`} />
            <TextField label="Phone" value={s.phone ?? ''} onChange={(phone) => set({ phone })} placeholder="+32 ..." />
            <TextField label="WhatsApp number" value={s.whatsapp_number ?? ''} onChange={(whatsapp_number) => set({ whatsapp_number })} placeholder="+32 ..." hint="Empty: no WhatsApp button." />
            <TextField label="Instagram name" value={s.instagram_handle} onChange={(instagram_handle) => set({ instagram_handle })} hint="Without the @." />
            <div className="sm:col-span-2">
              <TextField label="Address for appointments" value={s.address ?? ''} onChange={(address) => set({ address })} multiline rows={3} hint="Empty: “by appointment” only." />
            </div>
          </div>
        </Card>

        <Card title="On the site">
          <div className="grid gap-5">
            {SHOP_LIVE && (
              <Toggle label="Online shop open" checked={s.shop_enabled} onChange={(shop_enabled) => set({ shop_enabled })} hint="Off: pieces stay on the site but nothing can be bought; visitors are invited to ask instead." />
            )}
            <Toggle label="Wishlist" checked={s.wishlist_enabled} onChange={(wishlist_enabled) => set({ wishlist_enabled })} hint="A heart on each piece, so visitors can keep a list of favourites." />
            <Toggle label="Newsletter signup" checked={s.newsletter_enabled} onChange={(newsletter_enabled) => set({ newsletter_enabled })} />
          </div>
        </Card>

        {SHOP_LIVE && (
        <Card title="Shipping and gift wrap">
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="Shipping cost (€)" value={s.shipping_flat} onChange={(v) => set({ shipping_flat: v ?? 0 })} step={0.01} hint="Insured and tracked. 0 for free." />
            <NumberField label="Free shipping from (€)" value={s.free_shipping_from} onChange={(free_shipping_from) => set({ free_shipping_from })} step={1} hint="Empty: never free." />
            <Toggle label="Offer gift wrap" checked={s.gift_wrap_enabled} onChange={(gift_wrap_enabled) => set({ gift_wrap_enabled })} />
            <NumberField label="Gift wrap price (€)" value={s.gift_wrap_price} onChange={(v) => set({ gift_wrap_price: v ?? 0 })} step={0.01} hint="0 for free." />
          </div>
          <fieldset className="mt-6">
            <legend className="text-sm">Ships to</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {COUNTRIES.map(([code, name]) => {
                const on = s.ship_to.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    className="chip"
                    aria-pressed={on}
                    onClick={() => set({ ship_to: on ? s.ship_to.filter((c) => c !== code) : [...s.ship_to, code] })}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </Card>
        )}

        <Card title={SHOP_LIVE ? 'Invoices' : 'Company'}>
          <Help>
            {SHOP_LIVE ? 'Printed on every invoice and quoted in the legal pages.' : 'Shown at the bottom of every page and quoted in the legal pages.'} Ask your accountant which wording
            applies.
          </Help>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Company name" value={s.company_name ?? ''} onChange={(company_name) => set({ company_name })} />
            <TextField label="VAT number" value={s.vat_number ?? ''} onChange={(vat_number) => set({ vat_number })} placeholder="BE0123.456.789" />
            <TextField label="Registered address" value={s.company_address ?? ''} onChange={(company_address) => set({ company_address })} multiline rows={3} />
            <NumberField label="Belgian VAT rate (%)" value={s.vat_rate} onChange={(v) => set({ vat_rate: v ?? 0 })} step={0.01} hint="Prices on the site include VAT." />
            {SHOP_LIVE && (
              <div className="sm:col-span-2">
                <TextField label="Line at the bottom of invoices" value={s.invoice_footer ?? ''} onChange={(invoice_footer) => set({ invoice_footer })} multiline rows={2} placeholder="Bank details, legal mention..." />
              </div>
            )}
          </div>
        </Card>

        {SHOP_LIVE && <EuVatCard s={s} set={set} />}

        <Card title="Sharing">
          <ImageField
            label="Image when the site is shared"
            value={s.og_image_url}
            onChange={(og_image_url) => set({ og_image_url })}
            folder="site"
            aspect="aspect-[1200/630]"
            hint="Shown on WhatsApp, Facebook and LinkedIn when someone shares a link. Wide, 1200 by 630."
          />
        </Card>
      </div>

      <SaveBar state={state} onSave={save} />
    </div>
  );
}

/** Sales to private buyers in other EU countries, net of VAT, per calendar year. */
function useEuSales() {
  const db = getAdminDb();
  const [sales, setSales] = useState<{ thisYear: number; lastYear: number } | null>(null);
  useEffect(() => {
    const year = new Date().getFullYear();
    db.from('orders')
      .select('total, tax, paid_at')
      .in('status', ['paid', 'processing', 'shipped', 'delivered'])
      .in('vat_scheme', ['belgium', 'oss'])
      .neq('vat_country', HOME_COUNTRY)
      .gte('paid_at', `${year - 1}-01-01T00:00:00Z`)
      .then(({ data }) => {
        const net = (y: number) =>
          (data ?? []).filter((o) => new Date(o.paid_at).getUTCFullYear() === y).reduce((sum, o) => sum + Number(o.total) - Number(o.tax), 0);
        setSales({ thisYear: net(year), lastYear: net(year - 1) });
      });
  }, [db]);
  return sales;
}

function EuVatCard({ s, set }: { s: Settings; set: (patch: Partial<Settings>) => void }) {
  const sales = useEuSales();
  const euro = (n: number) => n.toLocaleString('en-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const over = Boolean(sales && (sales.thisYear > OSS_THRESHOLD || sales.lastYear > OSS_THRESHOLD));
  const overrides = s.eu_vat_rates ?? {};
  const setRate = (code: string, v: number | null) => {
    const next = { ...overrides };
    if (v == null || v === EU_VAT_RATES[code]) delete next[code];
    else next[code] = v;
    set({ eu_vat_rates: next });
  };
  return (
    <Card title="VAT for buyers in other EU countries">
      <Help>
        Prices stay the same for everyone; only the VAT inside them changes. Buyers in Belgium pay Belgian VAT. Buyers in other EU countries pay
        Belgian VAT until sales to them pass {euro(OSS_THRESHOLD)} in a year (net of VAT, all those countries together). From the sale that
        goes over, they pay their own country&apos;s VAT, which you declare through OSS. Buyers outside the EU pay no VAT (export).
      </Help>
      <p className="mb-5 text-sm">
        {sales ? (
          <>
            Sales to other EU countries: <strong>{euro(sales.thisYear)}</strong> this year, {euro(sales.lastYear)} last year.{' '}
            {s.oss_registered || over ? 'Buyers in other EU countries now pay their own country’s VAT.' : `Belgian VAT applies until ${euro(OSS_THRESHOLD)}.`}
          </>
        ) : (
          'Counting sales...'
        )}
      </p>
      <Toggle
        label="Registered for OSS"
        checked={s.oss_registered}
        onChange={(oss_registered) => set({ oss_registered })}
        hint="On: buyers in other EU countries pay their own country's VAT from now on, whatever the total."
      />
      <details className="mt-6">
        <summary className="cursor-pointer text-sm">VAT rate per country</summary>
        <p className="mt-2 text-xs text-[var(--color-stone)]">Standard rates checked against the European Commission on 12 October 2026. Change one only if a country changes its rate.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Object.keys(EU_VAT_RATES)
            .filter((c) => c !== HOME_COUNTRY)
            .map((code) => (
              <NumberField key={code} label={code} value={overrides[code] ?? EU_VAT_RATES[code]} onChange={(v) => setRate(code, v)} step={0.1} />
            ))}
        </div>
      </details>
    </Card>
  );
}
