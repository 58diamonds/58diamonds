import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { formatDate, formatPrice } from './format';
import type { Locale } from './i18n';
import { vatIncluded } from './shop';
import type { T } from './t';
import type { Order, OrderItem, Settings } from './types';

const INK = rgb(0.22, 0.19, 0.165);
const MUTED = rgb(0.44, 0.4, 0.36);
const GOLD = rgb(0.66, 0.51, 0.31);
const LINE = rgb(0.886, 0.855, 0.804);

/**
 * The invoice for a paid order, as a PDF. Prices include VAT; the VAT they
 * contain is shown at the rate the order was sold with (lib/vat.ts), with the
 * country whose VAT applies. Only characters the standard PDF
 * fonts can draw are kept (accents and the euro sign are fine).
 */
export async function invoicePdf(order: Order, items: OrderItem[], settings: Settings, t: T, locale: Locale): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${t('invoice.title')} ${order.invoice_number ?? order.number}`);
  pdf.setAuthor(settings.company_name || '58 Diamonds');
  pdf.setCreator(settings.company_name || '58 Diamonds');
  pdf.setProducer(settings.company_name || '58 Diamonds');
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const money = (n: number) => clean(formatPrice(n, order.currency, locale).replace(/ | /g, ' '));

  const left = 56;
  const right = 595.28 - 56;
  let y = 841.89 - 64;

  const text = (s: string, x: number, yy: number, o: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; align?: 'right' } = {}) => {
    const font = o.font ?? regular;
    const size = o.size ?? 10;
    const str = clean(s);
    const xx = o.align === 'right' ? x - font.widthOfTextAtSize(str, size) : x;
    page.drawText(str, { x: xx, y: yy, font, size, color: o.color ?? INK });
  };
  const rule = (yy: number) => page.drawLine({ start: { x: left, y: yy }, end: { x: right, y: yy }, thickness: 0.6, color: LINE });

  // Seller
  text('58 DIAMONDS', left, y, { font: serif, size: 22 });
  text('Private Jeweler', left, y - 16, { size: 8, color: GOLD });
  let sy = y;
  for (const l of [settings.company_name, ...(settings.company_address ?? '').split('\n'), settings.vat_number ? `VAT ${settings.vat_number}` : null, settings.email].filter(Boolean) as string[]) {
    text(l, right, sy, { size: 9, color: MUTED, align: 'right' });
    sy -= 13;
  }
  y = Math.min(y - 40, sy) - 30;

  text(t('invoice.title').toUpperCase(), left, y, { font: bold, size: 16 });
  y -= 26;
  text(`${t('invoice.number')}: ${order.invoice_number ?? '-'}`, left, y);
  text(`${t('invoice.date')}: ${formatDate(order.invoiced_at ?? order.paid_at ?? order.created_at, locale)}`, left, y - 14);
  text(t('account.order', { number: order.number }), left, y - 28);

  // Client
  const a = order.shipping_address ?? {};
  let cy = y;
  text(t('invoice.to'), right, cy + 14, { size: 8, color: GOLD, align: 'right' });
  for (const l of [order.name, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.country, order.email].filter(Boolean) as string[]) {
    text(l, right, cy, { size: 10, align: 'right' });
    cy -= 13;
  }
  y = Math.min(y - 50, cy) - 20;

  // Lines
  rule(y + 12);
  text(t('account.items'), left, y, { font: bold, size: 9 });
  text(t('cart.quantity'), right - 110, y, { font: bold, size: 9, align: 'right' });
  text(t('cart.total'), right, y, { font: bold, size: 9, align: 'right' });
  y -= 8;
  rule(y);
  y -= 16;
  const lines: [string, number, number][] = items.map((i) => [`${i.title}${i.variant ? ` (${t('piece.size')} ${i.variant})` : ''}`, i.quantity, i.unit_price * i.quantity]);
  const giftItem = items.find((i) => i.piece_id === null && i.title === t('invoice.gift_wrap'));
  if (order.gift_wrap && !giftItem) lines.push([t('invoice.gift_wrap'), 1, 0]);
  for (const [label, qty, total] of lines) {
    text(label.slice(0, 70), left, y);
    text(String(qty), right - 110, y, { align: 'right' });
    text(money(total), right, y, { align: 'right' });
    y -= 18;
    if (y < 160) break;
  }
  rule(y + 8);
  y -= 10;

  const sum = (label: string, value: string, strong = false) => {
    text(label, right - 130, y, { font: strong ? bold : regular, align: 'right', color: strong ? INK : MUTED });
    text(value, right, y, { font: strong ? bold : regular, align: 'right' });
    y -= 16;
  };
  sum(t('cart.subtotal'), money(order.subtotal));
  sum(t('cart.shipping'), order.shipping ? money(order.shipping) : t('cart.free'));
  sum(t('cart.total'), money(order.total), true);
  const rate = order.vat_rate ?? Number(settings.vat_rate);
  if (order.vat_scheme === 'export') {
    sum(t('invoice.vat_export'), money(0));
  } else {
    const where = order.vat_country ? `, ${order.vat_country}` : '';
    sum(`${t('invoice.vat_included')} (${rate}%${where})`, money(order.vat_rate == null ? vatIncluded(order.total, rate) : order.tax));
  }
  y -= 6;
  text(`${t('invoice.paid')} ${order.paid_at ? formatDate(order.paid_at, locale) : ''}${order.payment_method ? ` · ${order.payment_method}` : ''}`, right, y, { size: 9, color: GOLD, align: 'right' });

  if (settings.invoice_footer) {
    let fy = 70;
    for (const l of settings.invoice_footer.split('\n').slice(0, 4).reverse()) {
      text(l, left, fy, { size: 8, color: MUTED });
      fy += 11;
    }
  }
  drawFooterLine(page, regular);
  return pdf.save();
}

function drawFooterLine(page: PDFPage, font: PDFFont) {
  page.drawLine({ start: { x: 56, y: 54 }, end: { x: 595.28 - 56, y: 54 }, thickness: 0.6, color: LINE });
  const s = '58 DIAMONDS BY FARAH';
  page.drawText(s, { x: (595.28 - font.widthOfTextAtSize(s, 7)) / 2, y: 40, size: 7, font, color: MUTED });
}

/** Keep only what WinAnsi (the standard PDF fonts) can encode. */
function clean(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7e -ÿ€]/g, '');
}
