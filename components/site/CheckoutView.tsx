'use client';

import { loadStripe, type Appearance, type Stripe } from '@stripe/stripe-js';
import { CheckoutElementsProvider, PaymentElement, ShippingAddressElement, useCheckoutElements } from '@stripe/react-stripe-js/checkout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CHECKOUT_KEY, type PendingCheckout } from '@/lib/checkout-session';
import type { Locale } from '@/lib/i18n';
import { href } from '@/lib/routes';
import { countryName } from '@/lib/shipping';
import { useSite } from './SiteProvider';

/** The Stripe payment box, dressed like the rest of the site. */
const appearance: Appearance = {
  theme: 'flat',
  variables: {
    colorPrimary: '#2b2622',
    colorBackground: '#f7f4ee',
    colorText: '#2b2622',
    colorTextSecondary: '#6f665d',
    colorDanger: '#8a1c1c',
    fontFamily: 'Montserrat, "Helvetica Neue", Arial, sans-serif',
    fontSizeBase: '15px',
    borderRadius: '0px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { backgroundColor: 'transparent', border: '0', borderBottom: '1px solid #ddd5c8', boxShadow: 'none', paddingLeft: '0' },
    '.Input:focus': { borderBottomColor: '#8a6a3b', boxShadow: 'none' },
    '.Label': { fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8a6a3b' },
    '.Tab': { backgroundColor: 'transparent', border: '1px solid #ddd5c8', boxShadow: 'none' },
    '.Tab--selected': { borderColor: '#2b2622', boxShadow: 'none' },
    '.Tab:focus': { boxShadow: 'none' },
  },
};
const fonts = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500&display=swap' }];

const stripes = new Map<string, Promise<Stripe | null>>();

/**
 * Our own checkout page: the buyer types contact and address details in our
 * fields, only the payment box comes from Stripe. The bag starts the Stripe
 * session and leaves its secret in this tab's sessionStorage.
 */
export function CheckoutView({ countries }: { countries: string[] }) {
  const { locale, t } = useSite();
  const [pending, setPending] = useState<PendingCheckout | null | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_KEY);
      setPending(raw ? (JSON.parse(raw) as PendingCheckout) : null);
    } catch {
      setPending(null);
    }
  }, []);

  const stripe = useMemo(() => {
    if (!pending) return null;
    if (!stripes.has(pending.publishableKey)) stripes.set(pending.publishableKey, loadStripe(pending.publishableKey));
    return stripes.get(pending.publishableKey)!;
  }, [pending]);

  if (pending === undefined) return <div className="min-h-[60vh]" />;
  if (!pending || !stripe) return <Closed />;

  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 sm:pt-20">
      <h1 className="page-title text-center">{t('checkout.title')}</h1>
      <CheckoutElementsProvider
        stripe={stripe}
        options={{ clientSecret: pending.clientSecret, elementsOptions: { appearance, fonts }, adaptivePricing: { allowed: false } }}
      >
        <CheckoutForm pending={pending} countries={countries} locale={locale} />
      </CheckoutElementsProvider>
    </div>
  );
}

function Closed() {
  const { locale, t } = useSite();
  return (
    <div className="mx-auto max-w-xl px-5 py-28 text-center">
      <h1 className="page-title">{t('checkout.title')}</h1>
      <p className="mt-6 text-[var(--color-stone)]">{t('checkout.expired')}</p>
      <Link href={href.bag(locale)} className="btn btn-dark mt-10">
        {t('checkout.back')}
      </Link>
    </div>
  );
}

type Address = { name: string; line1: string; line2: string; postal: string; city: string; country: string };
const emptyAddress = (country: string): Address => ({ name: '', line1: '', line2: '', postal: '', city: '', country });

function CheckoutForm({ pending, countries, locale }: { pending: PendingCheckout; countries: string[]; locale: Locale }) {
  const { t } = useSite();
  const router = useRouter();
  const result = useCheckoutElements();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // Stripe's address form (suggests addresses while typing) fills this in.
  const [deliveryDone, setDeliveryDone] = useState(false);
  const [sameBilling, setSameBilling] = useState(true);
  const [billing, setBilling] = useState<Address>(() => emptyAddress(pending.country));
  const [business, setBusiness] = useState(false);
  const [company, setCompany] = useState('');
  const [vat, setVat] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (result.type === 'loading') return <p className="mt-16 text-center text-[var(--color-stone)]">{t('common.loading')}</p>;
  if (result.type === 'error') return <Closed />;
  const checkout = result.checkout;
  const fixedEmail = checkout.email;

  const missing = (v: string) => tried && !v.trim();
  const needed = [
    fixedEmail ? 'x' : email,
    phone,
    deliveryDone ? 'x' : '',
    ...(sameBilling ? [] : [billing.name, billing.line1, billing.postal, billing.city]),
    ...(business ? [company, vat] : []),
  ];

  async function back() {
    // Frees the pieces the session holds; the bag is still there.
    await fetch('/api/checkout', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientSecret: pending.clientSecret }),
    }).catch(() => null);
    try {
      sessionStorage.removeItem(CHECKOUT_KEY);
    } catch {}
    router.push(href.bag(locale));
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (needed.some((v) => !v.trim())) return setError(t('checkout.required'));
    setBusy(true);
    const contact = (a: Address) => ({
      name: a.name.trim(),
      address: { country: a.country, line1: a.line1.trim(), line2: a.line2.trim() || null, postal_code: a.postal.trim(), city: a.city.trim() },
    });
    const fail = (message?: string) => {
      setBusy(false);
      setError(message || t('cart.error'));
    };
    // Stripe can throw straight away (not only reject), and a payment that
    // never answers must not leave the button spinning for ever.
    const timeout = new Promise<{ type: 'error'; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ type: 'error', error: { message: t('cart.error') } }), 120000),
    );
    try {
      if (business) {
        const r = await checkout.updateTaxIdInfo({ businessName: company.trim(), taxId: { type: 'eu_vat', value: vat.replace(/[\s.]/g, '').toUpperCase() } });
        if (r.type === 'error') return fail(r.error.message);
      }
      // The delivery address is already on the session, from Stripe's address form.
      const shippingAddress = checkout.shippingAddress;
      if (!shippingAddress) return fail(t('checkout.required'));
      const r = await Promise.race([
        checkout.confirm({
          ...(fixedEmail ? {} : { email: email.trim() }),
          phoneNumber: phone.trim(),
          billingAddress: sameBilling ? shippingAddress : contact(billing),
        }),
        timeout,
      ]);
      // On success the browser is already on its way to the thank-you page.
      if (r.type === 'error') fail(r.error.message);
    } catch (err) {
      console.error('checkout confirm failed', err);
      fail(err instanceof Error ? err.message : undefined);
    }
  }

  const total = checkout.total.total.amount;

  return (
    <form onSubmit={pay} noValidate className="mt-12 grid gap-14 pb-24 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-12">
        <section>
          <p className="mb-8 text-base text-[var(--color-stone)]">{t('checkout.all_required')}</p>
          <h2 className="font-display text-3xl">{t('checkout.contact')}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {fixedEmail ? (
              <div>
                <span className="eyebrow">{t('checkout.email')}</span>
                <p className="py-[0.7rem]">{fixedEmail}</p>
              </div>
            ) : (
              <Field label={t('checkout.email')} value={email} onChange={setEmail} type="email" autoComplete="email" invalid={missing(email)} />
            )}
            <Field label={t('checkout.phone')} value={phone} onChange={setPhone} type="tel" autoComplete="tel" invalid={missing(phone)} />
          </div>
        </section>

        <section>
          <h2 className="font-display text-3xl">{t('checkout.delivery')}</h2>
          <div className="mt-6">
            <ShippingAddressElement options={{ display: { name: 'full' } }} onChange={(e) => setDeliveryDone(e.complete)} />
          </div>
          <label className="mt-6 flex cursor-pointer items-start gap-3 text-base">
            <input type="checkbox" checked={sameBilling} onChange={(e) => setSameBilling(e.target.checked)} className="mt-1.5 h-4 w-4 accent-[var(--color-ink)]" />
            <span>{t('checkout.billing_same')}</span>
          </label>
          <label className="mt-3 flex cursor-pointer items-start gap-3 text-base">
            <input type="checkbox" checked={business} onChange={(e) => setBusiness(e.target.checked)} className="mt-1.5 h-4 w-4 accent-[var(--color-ink)]" />
            <span>{t('checkout.business')}</span>
          </label>
          {business && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <Field label={t('checkout.company')} value={company} onChange={setCompany} autoComplete="organization" invalid={missing(company)} />
              <Field label={t('checkout.vat')} value={vat} onChange={setVat} placeholder="BE0123456789" invalid={missing(vat)} />
            </div>
          )}
        </section>

        {!sameBilling && (
          <section>
            <h2 className="font-display text-3xl">{t('checkout.billing')}</h2>
            <AddressFields value={billing} onChange={setBilling} section="billing" tried={tried} countries={countries} locale={locale} />
          </section>
        )}

        <section>
          <h2 className="font-display text-3xl">{t('checkout.payment')}</h2>
          <div className="mt-6">
            <PaymentElement options={{ layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never', link: 'never' }, fields: { billingDetails: { address: 'never', email: 'never', phone: 'never', name: 'never' } } }} onLoadError={(e) => setError(e.error.message || t('cart.error'))} />
          </div>
        </section>
      </div>

      <aside className="h-fit bg-[var(--color-pearl)] p-7 sm:p-9 lg:sticky lg:top-28">
        <h2 className="eyebrow">{t('checkout.summary')}</h2>
        <ul className="mt-5 space-y-3">
          {checkout.lineItems.map((l) => (
            <li key={l.id} className="flex justify-between gap-4">
              <span>
                {l.name}
                {l.quantity > 1 && <span className="text-[var(--color-stone)]"> × {l.quantity}</span>}
              </span>
              <span className="whitespace-nowrap">{l.total.amount}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-3 border-t border-[var(--color-line)] pt-5">
          <div className="flex justify-between">
            <dt className="text-[var(--color-stone)]">{t('cart.shipping')}</dt>
            <dd>{checkout.total.shippingRate.minorUnitsAmount ? checkout.total.shippingRate.amount : t('cart.free')}</dd>
          </div>
          <div className="flex justify-between border-t border-[var(--color-line)] pt-4 text-lg">
            <dt>{t('cart.total')}</dt>
            <dd>{total}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-[var(--color-stone)]">{t('cart.vat')}</p>
        <button type="submit" disabled={busy} className="btn btn-dark mt-7 w-full disabled:opacity-50">
          {busy ? t('common.loading') : t('checkout.pay', { total })}
        </button>
        {error && (
          <p className="mt-4 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
        <p className="mt-6 text-xs leading-relaxed text-[var(--color-stone)]">{t('cart.insured')}</p>
        <button type="button" onClick={back} className="mt-6 text-sm underline underline-offset-4 hover:text-[var(--color-gold)]">
          {t('checkout.back')}
        </button>
      </aside>
    </form>
  );
}

function AddressFields({
  value,
  onChange,
  section,
  tried,
  countries,
  locale,
}: {
  value: Address;
  onChange: (a: Address) => void;
  section: 'shipping' | 'billing';
  tried: boolean;
  countries: string[];
  locale: string;
}) {
  const { t } = useSite();
  const set = (k: keyof Address) => (v: string) => onChange({ ...value, [k]: v });
  const missing = (v: string) => tried && !v.trim();
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label={t('checkout.name')} value={value.name} onChange={set('name')} autoComplete={`${section} name`} invalid={missing(value.name)} />
      </div>
      <div className="sm:col-span-2">
        <Field label={t('checkout.line1')} value={value.line1} onChange={set('line1')} autoComplete={`${section} address-line1`} invalid={missing(value.line1)} />
      </div>
      <div className="sm:col-span-2">
        <Field label={t('checkout.line2')} value={value.line2} onChange={set('line2')} autoComplete={`${section} address-line2`} />
      </div>
      <Field label={t('checkout.postal')} value={value.postal} onChange={set('postal')} autoComplete={`${section} postal-code`} invalid={missing(value.postal)} />
      <Field label={t('checkout.city')} value={value.city} onChange={set('city')} autoComplete={`${section} address-level2`} invalid={missing(value.city)} />
      <label className="block sm:col-span-2">
        <span className="eyebrow">{t('checkout.country')}</span>
        {countries.length > 1 ? (
          <select value={value.country} onChange={(e) => set('country')(e.target.value)} autoComplete={`${section} country`} className="field">
            {countries
              .map((c) => [c, countryName(c, locale)] as const)
              .sort((a, b) => a[1].localeCompare(b[1], locale))
              .map(([c, name]) => (
                <option key={c} value={c}>
                  {name}
                </option>
              ))}
          </select>
        ) : (
          // Delivery goes to the country the shipping was priced for; change it in the bag.
          <p className="field">{countryName(value.country, locale)}</p>
        )}
      </label>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  invalid,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        {...rest}
        value={value}
        // Phone autofill often adds a stray space at the start or end: drop it.
        onChange={(e) => onChange(e.target.value.replace(/^\s+/, ''))}
        onBlur={(e) => {
          if (e.target.value !== e.target.value.trim()) onChange(e.target.value.trim());
        }}
        aria-invalid={invalid || undefined}
        className={`field ${invalid ? 'border-[var(--color-gold)]' : ''}`}
      />
    </label>
  );
}
