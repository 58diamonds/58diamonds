import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { formatDate, formatPrice } from './format';
import type { Locale } from './i18n';
import { vatIncluded } from './shop';
import type { T } from './t';
import type { Order, OrderItem, Settings } from './types';

/*
 * The invoice and the withdrawal form, in the "ivory atelier" style chosen by
 * Farah: ivory paper in a thin gold frame, the gold logo centred, Cormorant for
 * titles and amounts, Montserrat for the text and the small gold capitals.
 * Fonts and logo live in lib/pdf-assets (traced into the server build by
 * next.config.mjs).
 */

const W = 595.28;
const H = 841.89;
const MM = 2.8346;
const IVORY = rgb(0.973, 0.961, 0.937);
const INK = rgb(0.22, 0.188, 0.165);
const MUTED = rgb(0.43, 0.4, 0.37);
const SOFT = rgb(0.54, 0.5, 0.45);
const GOLD = rgb(0.541, 0.416, 0.231);
const FRAME = rgb(0.804, 0.749, 0.659);
const RULE = rgb(0.886, 0.855, 0.804);

const ASSETS = path.join(process.cwd(), 'lib', 'pdf-assets');
let assets: Promise<Record<string, Uint8Array>> | null = null;
function loadAssets() {
  assets ??= (async () => {
    const names = {
      serifLight: 'CormorantGaramond_300Light.ttf',
      serif: 'CormorantGaramond_400Regular.ttf',
      serifItalic: 'CormorantGaramond_400Regular_Italic.ttf',
      sans: 'Montserrat_300Light.ttf',
      sansMedium: 'Montserrat_500Medium.ttf',
      logo: 'logo-gold.png',
      mark: 'mark-gold.png',
    };
    const entries = await Promise.all(Object.entries(names).map(async ([k, f]) => [k, new Uint8Array(await readFile(path.join(ASSETS, f)))] as const));
    return Object.fromEntries(entries);
  })();
  return assets;
}

interface Kit {
  pdf: PDFDocument;
  page: PDFPage;
  f: { serifLight: PDFFont; serif: PDFFont; italic: PDFFont; sans: PDFFont; caps: PDFFont };
  logo: PDFImage;
  mark: PDFImage;
}

async function start(title: string, settings: Settings): Promise<Kit> {
  const a = await loadAssets();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const company = settings.company_name || '58 Diamonds';
  pdf.setTitle(title);
  pdf.setAuthor(company);
  pdf.setCreator(company);
  pdf.setProducer(company);
  const [serifLight, serif, italic, sans, caps, logo, mark] = await Promise.all([
    pdf.embedFont(a.serifLight),
    pdf.embedFont(a.serif),
    pdf.embedFont(a.serifItalic),
    pdf.embedFont(a.sans),
    pdf.embedFont(a.sansMedium),
    pdf.embedPng(a.logo),
    pdf.embedPng(a.mark),
  ]);
  const page = pdf.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: IVORY });
  page.drawRectangle({ x: 9 * MM, y: 9 * MM, width: W - 18 * MM, height: H - 18 * MM, borderColor: FRAME, borderWidth: 0.6 });
  return { pdf, page, f: { serifLight, serif, italic, sans, caps }, logo, mark };
}

type Align = 'left' | 'center' | 'right';
interface TextOpts {
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
  align?: Align;
  spacing?: number;
}

/** Draws one line; x is the left edge, the centre or the right edge depending on align. */
function draw(page: PDFPage, s: string, x: number, y: number, o: TextOpts) {
  const str = o.spacing ? s.toUpperCase() : s;
  const spacing = o.spacing ?? 0;
  const w = o.font.widthOfTextAtSize(str, o.size) + spacing * Math.max(0, str.length - 1);
  const xx = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  if (!spacing) {
    page.drawText(str, { x: xx, y, font: o.font, size: o.size, color: o.color ?? INK });
    return;
  }
  // Letter-spaced small capitals, drawn letter by letter.
  let cx = xx;
  for (const ch of str) {
    page.drawText(ch, { x: cx, y, font: o.font, size: o.size, color: o.color ?? GOLD });
    cx += o.font.widthOfTextAtSize(ch, o.size) + spacing;
  }
}

function wrap(s: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of s.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > width) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

const capsOpts = (k: Kit, align: Align = 'left'): TextOpts => ({ font: k.f.caps, size: 6.6, spacing: 1.7, color: GOLD, align });

/** "58 Diamonds is a trade name of Farah De Roeck, sole trader · VAT ...", when the two names differ. */
function tradeNameLine(settings: Settings, t: T): string {
  const company = settings.company_name || '58 Diamonds';
  const name = settings.legal_name?.trim();
  if (!name || name === company) return company;
  const line = t('invoice.trade_name', { company, name, vat: settings.vat_number || '' });
  return settings.vat_number ? line : line.split('·')[0].trim();
}

function footer(k: Kit, line: string) {
  const lines = wrap(line, k.f.sans, 6.6, W - 50 * MM);
  let y = 15 * MM + (lines.length - 1) * 9;
  for (const l of lines) {
    draw(k.page, l, W / 2, y, { font: k.f.sans, size: 6.6, color: SOFT, align: 'center' });
    y -= 9;
  }
}

function sellerLines(settings: Settings): string[] {
  const company = settings.company_name || '58 Diamonds';
  const legal = settings.legal_name?.trim();
  return [
    company,
    legal && legal !== company ? legal : null,
    ...(settings.company_address ?? '').split('\n'),
    settings.vat_number ? `VAT ${settings.vat_number}` : null,
    [settings.email, settings.phone].filter(Boolean).join(' · ') || null,
  ].filter((l): l is string => Boolean(l && l.trim()));
}

const methodName = (m: string | null) => (m ? m.charAt(0).toUpperCase() + m.slice(1).replace(/_/g, ' ') : '');

/**
 * The invoice for a paid order, as a PDF. Prices include VAT; the VAT they
 * contain is shown at the rate the order was sold with (lib/vat.ts), with the
 * country whose VAT applies.
 */
export async function invoicePdf(order: Order, items: OrderItem[], settings: Settings, t: T, locale: Locale): Promise<Uint8Array> {
  const k = await start(`${t('invoice.title')} ${order.invoice_number ?? order.number}`, settings);
  const { page, f } = k;
  const money = (n: number) => formatPrice(n, order.currency, locale).replace(/ | /g, ' ');
  const left = 22 * MM;
  const right = W - 22 * MM;

  // Logo and title
  const logoH = 24 * MM;
  const logoW = (k.logo.width / k.logo.height) * logoH;
  let y = H - 20 * MM - logoH;
  page.drawImage(k.logo, { x: (W - logoW) / 2, y, width: logoW, height: logoH });
  y -= 18 * MM;
  draw(page, t('invoice.title'), W / 2, y, { font: f.italic, size: 30, align: 'center' });

  // Number, date, order, payment
  y -= 14 * MM;
  const paidOn = order.paid_at ? formatDate(order.paid_at, locale) : '';
  const meta: [string, string][] = [
    [t('invoice.number'), order.invoice_number ?? '-'],
    [t('invoice.date'), formatDate(order.invoiced_at ?? order.paid_at ?? order.created_at, locale)],
    [t('invoice.order'), String(order.number)],
    [t('invoice.paid'), [methodName(order.payment_method), paidOn].filter(Boolean).join(', ')],
  ];
  const col = (right - left) / meta.length;
  meta.forEach(([label, value], i) => {
    const align: Align = i === 0 ? 'left' : i === meta.length - 1 ? 'right' : 'center';
    const x = align === 'left' ? left : align === 'right' ? right : left + col * i + col / 2;
    draw(page, label, x, y, capsOpts(k, align));
    draw(page, value, x, y - 15, { font: f.sans, size: 9, align });
  });

  // From and for
  y -= 17 * MM;
  draw(page, t('invoice.from'), left, y, capsOpts(k));
  draw(page, t('invoice.to'), right, y, capsOpts(k, 'right'));
  const billing = order.billing_address ?? {};
  const a = billing.line1 || billing.country ? billing : order.shipping_address ?? {};
  const buyer = [
    order.name,
    a.line1,
    a.line2,
    [a.postal_code, a.city].filter(Boolean).join(' '),
    a.country,
    order.buyer_vat ? `${t('invoice.buyer_vat')} ${order.buyer_vat}` : null,
    order.email,
  ].filter((l): l is string => Boolean(l));
  let sy = y - 14;
  for (const l of sellerLines(settings)) {
    draw(page, l, left, sy, { font: f.sans, size: 8.6 });
    sy -= 12.5;
  }
  let by = y - 14;
  for (const l of buyer) {
    draw(page, l, right, by, { font: f.sans, size: 8.6, align: 'right' });
    by -= 12.5;
  }
  y = Math.min(sy, by) - 9 * MM;

  // Pieces
  const qtyX = right - 34 * MM;
  draw(page, t('invoice.piece'), left, y, capsOpts(k));
  draw(page, t('cart.quantity'), qtyX, y, capsOpts(k, 'center'));
  draw(page, t('invoice.price'), right, y, capsOpts(k, 'right'));
  y -= 7;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: GOLD });
  const rows: { title: string; sub: string | null; qty: number; total: number }[] = items.map((i) => ({
    title: i.title,
    sub: i.variant,
    qty: i.quantity,
    total: i.unit_price * i.quantity,
  }));
  const giftItem = items.find((i) => i.piece_id === null && i.title === t('invoice.gift_wrap'));
  if (order.gift_wrap && !giftItem) rows.push({ title: t('invoice.gift_wrap'), sub: null, qty: 1, total: 0 });
  for (const r of rows) {
    if (y < 230) break;
    y -= 22;
    draw(page, r.title.slice(0, 60), left, y, { font: f.serif, size: 14 });
    draw(page, String(r.qty), qtyX, y, { font: f.sans, size: 8.6, align: 'center' });
    draw(page, money(r.total), right, y, { font: f.serif, size: 12.5, align: 'right' });
    if (r.sub) {
      y -= 12;
      draw(page, r.sub.slice(0, 80), left, y, { font: f.sans, size: 8, color: SOFT });
    }
    y -= 12;
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: RULE });
  }

  // Totals
  const tl = right - 74 * MM;
  y -= 18;
  const sum = (label: string, value: string) => {
    draw(page, label, tl, y, { font: f.sans, size: 8.6, color: MUTED });
    draw(page, value, right, y, { font: f.sans, size: 8.6, align: 'right' });
    y -= 15;
  };
  sum(t('cart.subtotal'), money(order.subtotal));
  sum(t('cart.shipping'), order.shipping ? money(order.shipping) : t('cart.free'));
  const rate = order.vat_rate ?? Number(settings.vat_rate);
  if (order.vat_scheme === 'export') {
    sum(t('invoice.excl_vat'), money(order.total));
    for (const [i, l] of wrap(t('invoice.vat_export'), f.sans, 8.6, 56 * MM).entries()) {
      draw(page, l, tl, y, { font: f.sans, size: 8.6, color: MUTED });
      if (i === 0) draw(page, money(0), right, y, { font: f.sans, size: 8.6, align: 'right' });
      y -= 12;
    }
    y -= 3;
  } else {
    const vat = order.vat_rate == null ? vatIncluded(order.total, rate) : order.tax;
    const where = order.vat_country ? `, ${order.vat_country}` : '';
    sum(t('invoice.excl_vat'), money(Math.round((order.total - vat) * 100) / 100));
    sum(`${t('invoice.vat_included')} (${rate}%${where})`, money(vat));
  }
  y += 4;
  page.drawLine({ start: { x: tl, y }, end: { x: right, y }, thickness: 0.6, color: GOLD });
  y -= 20;
  draw(page, t('invoice.total_paid'), tl, y + 3, capsOpts(k));
  draw(page, money(order.total), right, y, { font: f.serif, size: 17, align: 'right' });

  // Thank-you line and Farah's own footer text (Settings)
  const thanks = t('invoice.thanks').trim();
  y -= 22 * MM;
  if (thanks) {
    for (const l of wrap(thanks, f.italic, 14, right - left)) {
      draw(page, l, W / 2, y, { font: f.italic, size: 14, color: GOLD, align: 'center' });
      y -= 18;
    }
  }
  if (settings.invoice_footer) {
    let fy = 15 * MM + 30;
    for (const l of settings.invoice_footer.split('\n').slice(0, 4).reverse()) {
      draw(page, l, W / 2, fy, { font: f.sans, size: 7.4, color: MUTED, align: 'center' });
      fy += 10;
    }
  }
  footer(k, tradeNameLine(settings, t));
  return k.pdf.save();
}

/**
 * The model withdrawal form as a one-page PDF, sent with the order email so
 * the client keeps it on a durable medium. `body` is the "withdrawal" page as
 * plain lines: paragraphs ending in ":" become fields with lines to write on.
 */
export async function withdrawalPdf(title: string, body: string, settings: Settings, t?: T): Promise<Uint8Array> {
  const k = await start(title, settings);
  const { page, f } = k;
  const left = 24 * MM;
  const right = W - 24 * MM;
  const width = right - left;

  const markH = 14 * MM;
  const markW = (k.mark.width / k.mark.height) * markH;
  let y = H - 20 * MM - markH;
  page.drawImage(k.mark, { x: (W - markW) / 2, y, width: markW, height: markH });
  y -= 12 * MM;
  draw(page, title, W / 2, y, { font: f.italic, size: 26, align: 'center' });
  y -= 8 * MM;

  const writeLines = (n: number) => {
    for (let i = 0; i < n; i++) {
      y -= 22;
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: FRAME });
    }
    y -= 16;
  };
  const centred = (s: string, color = MUTED) => {
    for (const l of wrap(s, f.sans, 8.6, 135 * MM)) {
      draw(page, l, W / 2, y, { font: f.sans, size: 8.6, color, align: 'center' });
      y -= 13;
    }
  };

  const paras = body.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  let fields = false;
  for (const p of paras) {
    if (/^\(\*\)/.test(p)) {
      // "(*) Delete as appropriate."
      y -= 2;
      draw(page, p, left, y, { font: f.sans, size: 7.4, color: SOFT });
      y -= 12;
    } else if (p.endsWith(':')) {
      if (!fields) y -= 6;
      fields = true;
      const label = p.slice(0, -1).trim();
      if (label.length > 60) {
        for (const l of wrap(p, f.sans, 8.6, width)) {
          draw(page, l, left, y, { font: f.sans, size: 8.6 });
          y -= 13;
        }
        writeLines(2);
      } else {
        draw(page, label, left, y, capsOpts(k));
        writeLines(/addres|adres/i.test(label) ? 2 : 1);
      }
    } else if (/^(to|aan|à)\s*:/i.test(p)) {
      y -= 6;
      draw(page, p.split(':')[0], W / 2, y, capsOpts(k, 'center'));
      y -= 13;
      centred(p.slice(p.indexOf(':') + 1).trim(), INK);
      y -= 8;
    } else {
      centred(p);
      y -= 5;
    }
    if (y < 70) break;
  }
  footer(k, t ? tradeNameLine(settings, t) : settings.company_name || '58 Diamonds');
  return k.pdf.save();
}
