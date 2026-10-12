import 'server-only';
import { SITE_URL } from './config';
import { formatPrice } from './format';
import type { Locale } from './i18n';
import { href } from './routes';
import type { T } from './t';
import type { AppointmentRequest, Order, OrderItem } from './types';

/** The shop's emails, in the brand colours. Wording comes from the editable texts (group "Emails"). */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br>');

function layout(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f8f5ef;color:#38302a;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5ef"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="background:#38302a;padding:28px;text-align:center"><img src="${SITE_URL}/brand/logo-email.png" alt="58 Diamonds" width="150" style="display:inline-block;width:150px;height:auto"></td></tr>
<tr><td style="background:#ffffff;padding:32px 28px">
<h1 style="margin:0 0 18px;font-family:Georgia,serif;font-weight:normal;font-size:26px;color:#38302a">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:18px;text-align:center;color:#8a7f72;font-size:12px;letter-spacing:2px;text-transform:uppercase">58 Diamonds by Farah</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (url: string, label: string) =>
  `<p style="margin:28px 0"><a href="${url}" style="display:inline-block;background:#38302a;color:#f8f5ef;text-decoration:none;padding:13px 26px;font-size:12px;letter-spacing:3px;text-transform:uppercase">${esc(label)}</a></p>`;

function itemsTable(order: Order, items: OrderItem[], t: T, locale: Locale): string {
  const money = (n: number) => formatPrice(n, order.currency, locale);
  const rows = items
    .map(
      (i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e2dacd">${esc(i.title)}${i.variant ? ` <span style="color:#8a7f72">(${esc(t('piece.size'))} ${esc(i.variant)})</span>` : ''}${i.quantity > 1 ? ` × ${i.quantity}` : ''}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e2dacd;white-space:nowrap">${money(i.unit_price * i.quantity)}</td></tr>`,
    )
    .join('');
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:6px 0;${bold ? 'font-weight:bold' : 'color:#6f675c'}">${esc(label)}</td><td align="right" style="padding:6px 0;${bold ? 'font-weight:bold' : 'color:#6f675c'}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0">${rows}
${line(t('cart.subtotal'), money(order.subtotal))}
${line(t('cart.shipping'), order.shipping ? money(order.shipping) : esc(t('cart.free')))}
${line(t('cart.total'), money(order.total), true)}
</table><p style="color:#8a7f72;font-size:13px;margin:0">${esc(t('cart.vat'))}</p>`;
}

function address(order: Order): string {
  const a = order.shipping_address ?? {};
  return [order.name, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).map((x) => esc(String(x))).join('<br>');
}

/**
 * What the law asks to confirm on a durable medium after a sale: the
 * withdrawal right and its exceptions, the guarantee, links to the terms, and
 * the model withdrawal form itself (the "withdrawal" page, filled in).
 */
export interface OrderLegal {
  email: string;
  withdrawalForm: string;
}

const plain = (md: string) => md.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*#]/g, '');

function withdrawalBlock(legal: OrderLegal, t: T, locale: Locale) {
  const vars = { email: legal.email, terms: `${SITE_URL}${href.page(locale, 'terms')}`, returns: `${SITE_URL}${href.page(locale, 'returns')}` };
  const body = t('email.withdrawal', vars);
  const form = plain(legal.withdrawalForm).trim();
  const html = `<h2 style="margin:30px 0 10px;font-family:Georgia,serif;font-weight:normal;font-size:19px">${esc(t('email.withdrawal_title'))}</h2>
<p style="margin:0;font-size:14px">${nl2br(body)}</p>${form ? `<div style="margin:16px 0 0;padding:16px;background:#f8f5ef;font-size:13px;color:#6f675c">${nl2br(form)}</div>` : ''}`;
  const text = `${t('email.withdrawal_title')}\n${body}${form ? `\n\n${form}` : ''}`;
  return { html, text };
}

export function orderConfirmation(order: Order, items: OrderItem[], t: T, locale: Locale, legal: OrderLegal) {
  const subject = t('email.order_subject', { number: order.number });
  const url = `${SITE_URL}${href.order(locale, order.number)}`;
  const withdrawal = withdrawalBlock(legal, t, locale);
  const gift = order.gift_wrap || order.gift_message
    ? `<p style="margin:18px 0 0">${esc(t('cart.gift_wrap'))}${order.gift_message ? `<br><em>“${nl2br(order.gift_message)}”</em>` : ''}</p>`
    : '';
  const html = layout(subject, `<p>${nl2br(t('email.order_intro'))}</p>${itemsTable(order, items, t, locale)}${gift}
<p style="margin:22px 0 0"><strong>${esc(t('account.delivery'))}</strong><br>${address(order)}</p>
<p style="margin:22px 0 0">${nl2br(t('email.order_next'))}</p>${button(url, t('email.view_order'))}<p>${nl2br(t('email.sign_off'))}</p>${withdrawal.html}`);
  const text = `${subject}\n\n${t('email.order_intro')}\n\n${items.map((i) => `- ${i.title}${i.variant ? ` (${i.variant})` : ''} x${i.quantity}`).join('\n')}\n\n${t('cart.total')}: ${formatPrice(order.total, order.currency, locale)}\n\n${t('email.order_next')}\n${url}\n\n${t('email.sign_off')}\n\n${withdrawal.text}`;
  return { subject, html, text };
}

export function orderShipped(order: Order, t: T, locale: Locale) {
  const subject = t('email.shipped_subject', { number: order.number });
  const url = `${SITE_URL}${href.order(locale, order.number)}`;
  const tracking = order.tracking_number
    ? `<p><strong>${esc(t('account.tracking'))}</strong><br>${order.carrier ? `${esc(order.carrier)}: ` : ''}${esc(order.tracking_number)}</p>`
    : '';
  const html = layout(subject, `<p>${nl2br(t('email.shipped_intro'))}</p>${tracking}${order.tracking_url ? button(order.tracking_url, t('account.track')) : button(url, t('email.view_order'))}<p>${nl2br(t('email.sign_off'))}</p>`);
  const text = `${subject}\n\n${t('email.shipped_intro')}\n\n${order.carrier ?? ''} ${order.tracking_number ?? ''}\n${order.tracking_url ?? url}\n\n${t('email.sign_off')}`;
  return { subject, html, text };
}

/** Double opt-in: the link that turns a signup into a subscription. */
export function newsletterConfirm(confirmUrl: string, t: T) {
  const subject = t('email.newsletter_subject');
  const html = layout(subject, `<p>${nl2br(t('email.newsletter_intro'))}</p>${button(confirmUrl, t('email.newsletter_button'))}<p>${nl2br(t('email.sign_off'))}</p>`);
  return { subject, html, text: `${subject}\n\n${t('email.newsletter_intro')}\n\n${confirmUrl}\n\n${t('email.sign_off')}` };
}

/** To Farah. Always in English: it is her own notification. */
export function adminNewOrder(order: Order, items: OrderItem[], oversold: boolean) {
  const subject = `New order ${order.number}: ${formatPrice(order.total, order.currency, 'en')}`;
  const warn = oversold
    ? `<p style="background:#f6e7d8;padding:12px;border-left:3px solid #a8834e"><strong>Attention:</strong> a piece in this order was already sold out when the payment came in. Contact the client before shipping.</p>`
    : '';
  const list = items.map((i) => `${esc(i.title)}${i.variant ? ` (size ${esc(i.variant)})` : ''} × ${i.quantity}`).join('<br>');
  const gift = order.gift_wrap ? `<p><strong>Gift wrap</strong>${order.gift_message ? `<br>Card: “${nl2br(order.gift_message)}”` : ''}</p>` : '';
  const html = layout(subject, `${warn}<p>${list}</p>${gift}<p><strong>Ship to</strong><br>${address(order)}<br>${esc(order.email)}${order.phone ? `<br>${esc(order.phone)}` : ''}</p>${button(`${SITE_URL}/admin/orders/${order.id}`, 'Open in admin')}`);
  return { subject, html, text: `${subject}\n${items.map((i) => `${i.title} x${i.quantity}`).join('\n')}\n${SITE_URL}/admin/orders/${order.id}` };
}

export function adminNewRequest(r: Pick<AppointmentRequest, 'name' | 'email' | 'phone' | 'preferred_date' | 'message'>) {
  const subject = `Appointment request from ${r.name}`;
  const rows = [
    ['Email', r.email],
    ['Phone', r.phone],
    ['Preferred', r.preferred_date],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<strong>${k}</strong>: ${esc(String(v))}`)
    .join('<br>');
  const html = layout(subject, `<p>${rows}</p>${r.message ? `<p>${nl2br(r.message)}</p>` : ''}${button(`${SITE_URL}/admin/requests`, 'Open requests')}`);
  return { subject, html, text: `${subject}\n${r.email ?? ''} ${r.phone ?? ''}\n${r.preferred_date ?? ''}\n\n${r.message}` };
}
