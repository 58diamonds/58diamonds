import 'server-only';
import { formatWhen } from './booking';
import { ADMIN_URL, SITE_URL } from './config';
import { formatPrice } from './format';
import type { Locale } from './i18n';
import { href } from './routes';
import { countryName } from './shipping';
import type { T } from './t';
import type { AppointmentRequest, Order, OrderItem } from './types';

/** The shop's emails, in the brand colours. Wording comes from the editable texts (group "Emails"). */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br>');

/*
 * Ivory, like the site and the invoice: ivory paper in a thin gold frame, the
 * gold logo centred, Cormorant titles (Georgia where the font can't load),
 * Montserrat text, small gold capitals for labels, espresso buttons.
 */
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const SANS = "Montserrat,Helvetica,Arial,sans-serif";
const label = (s: string) => `<span style="font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a6a3b">${esc(s)}</span>`;

function layout(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,400&family=Montserrat:wght@300;500&display=swap" rel="stylesheet"></head>
<body style="margin:0;background:#f8f5ef;color:#38302a;font-family:${SANS};font-weight:300;font-size:14px;line-height:1.7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5ef"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;border:1px solid #cdbfa8;background:#f8f5ef">
<tr><td style="padding:40px 32px 6px;text-align:center"><img src="${SITE_URL}/brand/logo-gold-email.png" alt="58 Diamonds" width="140" style="display:inline-block;width:140px;height:auto;border:0"></td></tr>
<tr><td style="padding:22px 32px 40px">
<h1 style="margin:0 0 24px;font-family:${SERIF};font-style:italic;font-weight:400;font-size:32px;line-height:1.2;color:#38302a;text-align:center">${esc(title)}</h1>
${body}
</td></tr>
</table>
<p style="margin:18px 0 0;text-align:center;font-family:${SANS};color:#8a7f72;font-size:10px;letter-spacing:3px;text-transform:uppercase">58 Diamonds by Farah</p>
</td></tr></table></body></html>`;
}

const button = (url: string, text: string) =>
  `<p style="margin:30px 0;text-align:center"><a href="${url}" style="display:inline-block;background:#38302a;color:#f8f5ef;text-decoration:none;padding:14px 30px;font-family:${SANS};font-weight:500;font-size:11px;letter-spacing:3px;text-transform:uppercase">${esc(text)}</a></p>`;

function itemsTable(order: Order, items: OrderItem[], t: T, locale: Locale): string {
  const money = (n: number) => formatPrice(n, order.currency, locale);
  const rows = items
    .map(
      (i) => `<tr><td style="padding:14px 0;border-bottom:1px solid #e2dacd"><span style="font-family:${SERIF};font-size:19px">${esc(i.title)}${i.quantity > 1 ? ` × ${i.quantity}` : ''}</span>${i.variant ? `<br><span style="color:#8a7f72;font-size:12px">${esc(i.variant)}</span>` : ''}</td><td align="right" style="padding:14px 0;border-bottom:1px solid #e2dacd;white-space:nowrap;font-family:${SERIF};font-size:17px">${money(i.unit_price * i.quantity)}</td></tr>`,
    )
    .join('');
  const line = (name: string, value: string) => `<tr><td style="padding:5px 0;color:#6f675c">${esc(name)}</td><td align="right" style="padding:5px 0;color:#6f675c">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0"><tr><td style="padding-bottom:8px;border-bottom:1px solid #8a6a3b">${label(t('invoice.piece'))}</td><td align="right" style="padding-bottom:8px;border-bottom:1px solid #8a6a3b">${label(t('invoice.price'))}</td></tr>${rows}
<tr><td style="padding-top:12px"></td><td></td></tr>
${line(t('cart.subtotal'), money(order.subtotal))}
${line(t('cart.shipping'), order.shipping ? money(order.shipping) : esc(t('cart.free')))}
<tr><td style="padding:12px 0 0;border-top:1px solid #8a6a3b">${label(t('cart.total'))}</td><td align="right" style="padding:8px 0 0;border-top:1px solid #8a6a3b;font-family:${SERIF};font-size:22px">${money(order.total)}</td></tr>
</table><p style="color:#8a7f72;font-size:12px;margin:6px 0 0;text-align:right">${esc(t('cart.vat'))}</p>`;
}

function address(order: Order, locale: Locale = 'en'): string {
  const a = order.shipping_address ?? {};
  return [order.name, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.country ? countryName(a.country, locale) : null].filter(Boolean).map((x) => esc(String(x))).join('<br>');
}

/**
 * What the law asks to confirm on a durable medium after a sale: the
 * withdrawal right and its exceptions, the guarantee and links to the terms,
 * as a short note at the foot of the email. The model withdrawal form itself
 * travels as a PDF attachment (lib/invoice.ts withdrawalPdf).
 */
export interface OrderLegal {
  email: string;
}

function withdrawalBlock(legal: OrderLegal, t: T, locale: Locale) {
  const vars = { email: legal.email, form: `${SITE_URL}${href.page(locale, 'withdrawal')}`, terms: `${SITE_URL}${href.page(locale, 'terms')}`, returns: `${SITE_URL}${href.page(locale, 'returns')}` };
  const body = t('email.withdrawal_note', vars);
  const link = (url: string, label: string) => `<a href="${url}" style="color:#8a7a62">${esc(label)}</a>`;
  const html = `<p style="margin:34px 0 0;padding-top:14px;border-top:1px solid #e2dacd;font-size:12px;color:#8a7a62">${nl2br(body)}<br>${link(vars.form, t('email.link_form'))} · ${link(vars.terms, t('email.link_terms'))} · ${link(vars.returns, t('email.link_returns'))}</p>`;
  const text = `${body}\n${t('email.link_form')}: ${vars.form}\n${t('email.link_terms')}: ${vars.terms}\n${t('email.link_returns')}: ${vars.returns}`;
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
<p style="margin:26px 0 0">${label(t('account.delivery'))}<br>${address(order, locale)}</p>
<p style="margin:22px 0 0">${nl2br(t('email.order_next'))}</p>${button(url, t('email.view_order'))}<p>${nl2br(t('email.sign_off'))}</p>${withdrawal.html}`);
  const text = `${subject}\n\n${t('email.order_intro')}\n\n${items.map((i) => `- ${i.title}${i.variant ? ` (${i.variant})` : ''} x${i.quantity}`).join('\n')}\n\n${t('cart.total')}: ${formatPrice(order.total, order.currency, locale)}\n\n${t('email.order_next')}\n${url}\n\n${t('email.sign_off')}\n\n${withdrawal.text}`;
  return { subject, html, text };
}

export function orderShipped(order: Order, t: T, locale: Locale) {
  const subject = t('email.shipped_subject', { number: order.number });
  const url = `${SITE_URL}${href.order(locale, order.number)}`;
  const tracking = order.tracking_number
    ? `<p>${label(t('account.tracking'))}<br>${order.carrier ? `${esc(order.carrier)}: ` : ''}${esc(order.tracking_number)}</p>`
    : '';
  const html = layout(subject, `<p>${nl2br(t('email.shipped_intro'))}</p>${tracking}${order.tracking_url ? button(order.tracking_url, t('account.track')) : button(url, t('email.view_order'))}<p>${nl2br(t('email.sign_off'))}</p>`);
  const text = `${subject}\n\n${t('email.shipped_intro')}\n\n${order.carrier ?? ''} ${order.tracking_number ?? ''}\n${order.tracking_url ?? url}\n\n${t('email.sign_off')}`;
  return { subject, html, text };
}

/** Client account: confirm the email after signing up, or choose a new password. */
export function accountEmail(kind: 'welcome' | 'reset', url: string, t: T) {
  const subject = t(`email.${kind}_subject`);
  const intro = t(`email.${kind}_intro`);
  const label = t(`email.${kind}_button`);
  const html = layout(subject, `<p>${nl2br(intro)}</p>${button(url, label)}<p>${nl2br(t('email.sign_off'))}</p>`);
  return { subject, html, text: `${subject}\n\n${intro}\n\n${url}\n\n${t('email.sign_off')}` };
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
  const html = layout(subject, `${warn}<p>${list}</p>${gift}<p><strong>Ship to</strong><br>${address(order)}<br>${esc(order.email)}${order.phone ? `<br>${esc(order.phone)}` : ''}</p>${button(`${ADMIN_URL}/orders/${order.id}`, 'Open in admin')}`);
  return { subject, html, text: `${subject}\n${items.map((i) => `${i.title} x${i.quantity}`).join('\n')}\n${ADMIN_URL}/orders/${order.id}` };
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
  const html = layout(subject, `<p>${rows}</p>${r.message ? `<p>${nl2br(r.message)}</p>` : ''}${button(`${ADMIN_URL}/requests`, 'Open requests')}`);
  return { subject, html, text: `${subject}\n${r.email ?? ''} ${r.phone ?? ''}\n${r.preferred_date ?? ''}\n\n${r.message}` };
}

/* Booking calendar ------------------------------------------------------- */

type Booking = Pick<AppointmentRequest, 'name' | 'email' | 'phone' | 'message'> & { starts_at: string };

const whenOf = (r: Booking, locale: Locale) => formatWhen(Date.parse(r.starts_at), locale);

/** To the client right after booking: received, not yet confirmed. */
export function bookingReceived(r: Booking, t: T, locale: Locale) {
  const subject = t('email.booking_received_subject');
  const body = t('email.booking_received', { when: whenOf(r, locale) });
  const html = layout(subject, `<p>${nl2br(body)}</p><p>${nl2br(t('email.sign_off'))}</p>`);
  return { subject, html, text: `${subject}\n\n${body}\n\n${t('email.sign_off')}` };
}

export function bookingConfirmed(r: Booking, t: T, locale: Locale, place: string, cancelUrl: string) {
  const subject = t('email.booking_confirmed_subject');
  const body = t('email.booking_confirmed', { when: whenOf(r, locale), address: place });
  const html = layout(subject, `<p>${nl2br(body)}</p>${button(cancelUrl, t('email.booking_cancel'))}<p>${nl2br(t('email.sign_off'))}</p>`);
  return { subject, html, text: `${subject}\n\n${body}\n\n${t('email.booking_cancel')}: ${cancelUrl}\n\n${t('email.sign_off')}` };
}

export function bookingDeclined(r: Booking, t: T, locale: Locale, note: string | null, bookUrl: string) {
  const subject = t('email.booking_declined_subject');
  const body = t('email.booking_declined', { when: whenOf(r, locale) });
  const html = layout(subject, `<p>${nl2br(body)}</p>${note ? `<p style="padding:14px;background:#f8f5ef"><em>${nl2br(note)}</em></p>` : ''}${button(bookUrl, t('email.booking_choose'))}<p>${nl2br(t('email.sign_off'))}</p>`);
  return { subject, html, text: `${subject}\n\n${body}${note ? `\n\n${note}` : ''}\n\n${bookUrl}\n\n${t('email.sign_off')}` };
}

export function bookingReminder(r: Booking, t: T, locale: Locale, place: string, cancelUrl: string) {
  const subject = t('email.booking_reminder_subject');
  const body = t('email.booking_reminder', { when: whenOf(r, locale), address: place });
  const html = layout(subject, `<p>${nl2br(body)}</p>${button(cancelUrl, t('email.booking_cancel'))}<p>${nl2br(t('email.sign_off'))}</p>`);
  return { subject, html, text: `${subject}\n\n${body}\n\n${cancelUrl}\n\n${t('email.sign_off')}` };
}

const bookingRows = (r: Booking) =>
  [
    ['When', formatWhen(Date.parse(r.starts_at), 'en')],
    ['Email', r.email],
    ['Phone', r.phone],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<strong>${k}</strong>: ${esc(String(v))}`)
    .join('<br>');

/** To Farah: a client picked a time. Approve or decline in one tap. */
export function adminNewBooking(r: Booking, decideUrl: string, reminder = false) {
  const when = formatWhen(Date.parse(r.starts_at), 'en');
  const subject = `${reminder ? 'Waiting for your answer: ' : ''}Appointment request from ${r.name}, ${when}`;
  const wa = r.phone ? `https://wa.me/${r.phone.replace(/\D/g, '').replace(/^00/, '')}` : null;
  const html = layout(
    subject,
    `<p>${bookingRows(r)}</p>${r.message ? `<p>${nl2br(r.message)}</p>` : ''}<p>The time is held in your "58 Diamonds requests" calendar until you answer.</p>${button(`${decideUrl}&action=approve`, 'Approve')}${button(`${decideUrl}&action=decline`, 'Decline')}${wa ? `<p><a href="${wa}" style="color:#8a6a3b">Message ${esc(r.name)} on WhatsApp</a></p>` : ''}`,
  );
  return { subject, html, text: `${subject}\n${r.email ?? ''} ${r.phone ?? ''}\n\n${r.message}\n\nApprove: ${decideUrl}&action=approve\nDecline: ${decideUrl}&action=decline` };
}

export function adminBookingCancelled(r: Booking) {
  const when = formatWhen(Date.parse(r.starts_at), 'en');
  const subject = `${r.name} cancelled the appointment of ${when}`;
  const html = layout(subject, `<p>${bookingRows(r)}</p><p>The time is free again and has been removed from your calendar.</p>${button(`${ADMIN_URL}/requests`, 'Open requests')}`);
  return { subject, html, text: `${subject}\n${r.email ?? ''} ${r.phone ?? ''}` };
}
