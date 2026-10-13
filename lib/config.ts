/** Where the business is, for showing event dates and times. */
export const TIME_ZONE = 'Europe/Brussels';

export const SITE_NAME = '58 Diamonds';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
/** The admin has its own address, the site's with "admin." in front (admin.58diamonds.com). */
export const ADMIN_URL = SITE_URL.replace('://www.', '://').replace('://', '://admin.');

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Without Supabase configured, the site renders sample content so it can be previewed. */
export const HAS_DATABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * The online shop (bag, checkout, client accounts, orders) is built but kept
 * out of sight until NEXT_PUBLIC_SHOP is "on". Off: those addresses answer
 * "not found", the site shows no bag or account, and the admin shows no shop
 * screens. Pieces still show in the collection, with a price or "on request".
 */
export const SHOP_LIVE = process.env.NEXT_PUBLIC_SHOP === 'on';

/** Shop addresses that do not exist while the shop is hidden. */
export const SHOP_PATHS = {
  site: ['bag', 'checkout', 'account'],
  api: ['/api/checkout', '/api/account', '/api/order', '/api/invoice', '/api/stripe', '/api/admin/shipped-email'],
  admin: ['/admin/orders', '/admin/clients'],
};
