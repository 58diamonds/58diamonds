'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Photo } from '@/components/site/Photo';
import { useSite } from '@/components/site/SiteProvider';
import { formatDate, formatPrice } from '@/lib/format';
import { href } from '@/lib/routes';
import { getBrowserDb } from '@/lib/supabase';
import type { Order, OrderItem } from '@/lib/types';
import { StatusBadge } from './AccountHome';
import { AuthForms } from './AuthForms';
import { downloadInvoice, useAccount } from './useAccount';

const STEPS: Order['status'][] = ['paid', 'processing', 'shipped', 'delivered'];

/** One order: items, payment, delivery with tracking, and the invoice. */
export function OrderDetail({ number }: { number: number }) {
  const { locale, t } = useSite();
  const { session, ready } = useAccount();
  const [order, setOrder] = useState<(Order & { order_items: OrderItem[] }) | null | undefined>(undefined);

  useEffect(() => {
    if (!session) return;
    getBrowserDb()
      .from('orders')
      .select('*, order_items(*)')
      .eq('number', number)
      .maybeSingle()
      .then(({ data }) => setOrder(data as (Order & { order_items: OrderItem[] }) | null));
  }, [session, number]);

  if (!ready) return <p className="py-20 text-center text-[var(--color-stone)]">{t('common.loading')}</p>;
  if (!session) return <div className="py-10"><AuthForms /></div>;
  if (order === undefined) return <p className="py-20 text-center text-[var(--color-stone)]">{t('common.loading')}</p>;
  if (order === null) return <p className="py-20 text-center text-[var(--color-stone)]">{t('notfound.text')}</p>;

  const money = (n: number) => formatPrice(Number(n), order.currency, locale);
  const step = STEPS.indexOf(order.status);
  const a = order.shipping_address ?? {};

  return (
    <div>
      <Link href={href.account(locale)} className="eyebrow hover:text-[var(--color-ink)]">
        ← {t('account.back')}
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-5xl">{t('account.order', { number: `#${order.number}` })}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-[var(--color-stone)]">{t('account.ordered_on', { date: formatDate(order.created_at, locale) })}</p>

      {step >= 0 && (
        <ol className="mt-10 grid grid-cols-4 gap-2" aria-label={t('account.delivery')}>
          {STEPS.map((s, i) => (
            <li key={s} className="text-center">
              <span className={`block h-0.5 ${i <= step ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-line)]'}`} />
              <span className={`mt-3 block text-[0.65rem] uppercase tracking-[0.16em] ${i <= step ? '' : 'text-[var(--color-stone)]'}`}>{t(`status.${s}`)}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-14 grid gap-14 lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="eyebrow mb-4">{t('account.items')}</h2>
          <ul className="border-t border-[var(--color-line)]">
            {order.order_items.map((i) => (
              <li key={i.id} className="grid grid-cols-[5rem_1fr_auto] items-center gap-5 border-b border-[var(--color-line)] py-5">
                <Photo src={i.image_url} alt={i.title} className="aspect-square w-full" />
                <span>
                  <span className="font-display block text-xl">{i.title}</span>
                  {i.variant && <span className="text-sm text-[var(--color-stone)]">{t('piece.size')} {i.variant}</span>}
                  {i.quantity > 1 && <span className="text-sm text-[var(--color-stone)]"> × {i.quantity}</span>}
                </span>
                <span>{money(Number(i.unit_price) * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2">
            <div className="flex justify-between"><dt className="text-[var(--color-stone)]">{t('cart.subtotal')}</dt><dd>{money(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--color-stone)]">{t('cart.shipping')}</dt><dd>{Number(order.shipping) ? money(order.shipping) : t('cart.free')}</dd></div>
            <div className="flex justify-between border-t border-[var(--color-line)] pt-3 text-lg"><dt>{t('cart.total')}</dt><dd>{money(order.total)}</dd></div>
          </dl>
          {order.gift_wrap && (
            <p className="mt-6 text-sm">
              {t('cart.gift_wrap')}
              {order.gift_message && <span className="mt-1 block italic text-[var(--color-stone)]">“{order.gift_message}”</span>}
            </p>
          )}
        </section>

        <aside className="space-y-10">
          <div>
            <h2 className="eyebrow mb-3">{t('account.payment')}</h2>
            {order.paid_at ? (
              <p>
                {t('account.paid_on', { date: formatDate(order.paid_at, locale) })}
                {order.payment_method && <span className="text-[var(--color-stone)]"> · {order.payment_method}</span>}
              </p>
            ) : (
              <StatusBadge status={order.status} />
            )}
            {order.invoice_number && (
              <button type="button" onClick={() => downloadInvoice(order.id, order.invoice_number!)} className="mt-4 text-sm underline underline-offset-4 hover:text-[var(--color-gold)]">
                {t('invoice.download')}
              </button>
            )}
          </div>
          <div>
            <h2 className="eyebrow mb-3">{t('account.delivery')}</h2>
            <p className="leading-relaxed">
              {[order.name, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).map((l, i) => (
                <span key={i} className="block">{l}</span>
              ))}
            </p>
            {order.tracking_number && (
              <p className="mt-4 text-sm">
                {t('account.tracking')}: {order.carrier && <>{order.carrier} </>}
                {order.tracking_number}
              </p>
            )}
            {order.tracking_url && (
              <a href={order.tracking_url} target="_blank" rel="noreferrer" className="btn btn-dark mt-5">
                {t('account.track')}
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
