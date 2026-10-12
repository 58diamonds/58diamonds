import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { DEMO_SETTINGS } from './demo';
import { invoicePdf } from './invoice';
import type { Order } from './types';

describe('invoice PDF', () => {
  it('renders an order with accents, euro signs and a gift wrap', async () => {
    const order = {
      id: 'o', number: 1001, customer_id: null, email: 'zoë@example.com', name: 'Zoë Lefèvre', phone: null,
      shipping_address: { line1: 'Rue de l’Été 5', postal_code: '1000', city: 'Bruxelles', country: 'BE' },
      locale: 'fr', status: 'paid', currency: 'EUR', subtotal: 6800, shipping: 0, tax: 1180.17, total: 6800, vat_rate: 21, vat_country: 'BE', vat_scheme: 'belgium',
      payment_method: 'bancontact', paid_at: '2026-10-09T10:00:00Z', carrier: null, tracking_number: null, tracking_url: null,
      shipped_at: null, delivered_at: null, gift_wrap: true, gift_message: 'Joyeux anniversaire', note: null,
      invoice_number: '2026-0001', invoiced_at: '2026-10-09T10:00:00Z', created_at: '2026-10-09T09:50:00Z',
    } satisfies Order;
    const items = [{ id: 'i', order_id: 'o', piece_id: 'p', variant_id: 'v', title: 'Bague poire halo', variant: '52', image_url: null, unit_price: 6800, quantity: 1 }];
    const t = (k: string) => k;
    const bytes = await invoicePdf(order, items, { ...DEMO_SETTINGS, company_name: 'Farah BV', company_address: 'Pelikaanstraat 1\n2018 Antwerpen', vat_number: 'BE0123456789' }, t as never, 'fr');
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1500);
  });

  it('renders an export and an older order without a stored VAT rate', async () => {
    const base = {
      id: 'o', number: 1002, customer_id: null, email: 'a@example.com', name: 'A', phone: null, shipping_address: { country: 'CH' },
      locale: 'en', status: 'paid', currency: 'EUR', subtotal: 1000, shipping: 0, tax: 0, total: 1000,
      payment_method: 'card', paid_at: '2026-10-09T10:00:00Z', carrier: null, tracking_number: null, tracking_url: null,
      shipped_at: null, delivered_at: null, gift_wrap: false, gift_message: null, note: null,
      invoice_number: '2026-0002', invoiced_at: '2026-10-09T10:00:00Z', created_at: '2026-10-09T09:50:00Z',
    } as const;
    const t = (k: string) => k;
    for (const order of [
      { ...base, vat_rate: 0, vat_country: 'CH', vat_scheme: 'export' as const },
      { ...base, vat_rate: null, vat_country: null, vat_scheme: null },
    ] satisfies Order[]) {
      const bytes = await invoicePdf(order, [], DEMO_SETTINGS, t as never, 'en');
      expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
    }
  });
});
