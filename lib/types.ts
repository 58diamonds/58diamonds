import type { L10n } from './i18n';

/** Row shapes of the database (supabase/migrations/0001_init.sql). */

export type HomeBlock = 'tiles' | 'featured' | 'sections' | 'house' | 'story' | 'events' | 'instagram' | 'newsletter' | 'contact';

/** One square under the homepage photo: a photo that opens a piece (named under the photo) or a collection section. */
export interface HomeTile {
  image_url: string | null;
  section_id: string | null;
  piece_id?: string | null;
}

/** Colour of the header logo: as drawn (dark brown), black, or gold (diamond and letters). */
export type HeaderLogo = 'ink' | 'black' | 'brown-gold';

export interface Settings {
  whatsapp_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram_handle: string;
  currency: string;
  shop_enabled: boolean;
  press_enabled: boolean;
  events_enabled: boolean;
  shipping_flat: number;
  free_shipping_from: number | null;
  ship_to: string[];
  gift_wrap_enabled: boolean;
  gift_wrap_price: number;
  wishlist_enabled: boolean;
  newsletter_enabled: boolean;
  company_name: string | null;
  company_address: string | null;
  vat_number: string | null;
  vat_rate: number;
  /** Registered for OSS: other EU buyers always pay their own country's VAT. */
  oss_registered: boolean;
  /** Admin overrides of the built-in EU rates (lib/vat.ts), per country code. */
  eu_vat_rates: Record<string, number>;
  invoice_footer: string | null;
  hero_image_url: string | null;
  about_image_url: string | null;
  og_image_url: string | null;
  home_blocks: HomeBlock[];
  home_tiles: HomeTile[];
  header_logo: HeaderLogo;
}

export interface Page {
  id: string;
  slug: string;
  title: L10n;
  body: L10n;
  image_url: string | null;
  seo_title: L10n;
  seo_description: L10n;
  published: boolean;
  updated_at?: string;
}

export type MenuTarget = 'home' | 'shop' | 'events' | 'press' | 'contact' | 'account';

export interface MenuItem {
  id: string;
  menu: 'header' | 'footer';
  kind: 'builtin' | 'page' | 'section' | 'link';
  target: MenuTarget | null;
  page_id: string | null;
  section_id: string | null;
  url: string | null;
  label: L10n;
  position: number;
  visible: boolean;
}

export interface Section {
  id: string;
  slug: string;
  name: L10n;
  description: L10n;
  cover_url: string | null;
  position: number;
  visible: boolean;
  show_prices: boolean;
}

export interface Attribute {
  id: string;
  kind: 'metal' | 'stone';
  slug: string;
  /** The name in the filter, e.g. "LG Diamond". */
  label: L10n;
  /** Optional longer name on the piece page, e.g. "Laboratory Grown Diamond". */
  full_label: L10n;
  position: number;
}

export interface PieceImage {
  id: string;
  piece_id: string;
  url: string;
  alt: L10n;
  position: number;
  /** Photo on a model: the homepage squares and the collection hover use it. */
  worn: boolean;
}

export interface PieceVariant {
  id: string;
  piece_id: string;
  label: string;
  stock: number;
  position: number;
}

export interface Piece {
  id: string;
  section_id: string | null;
  slug: string;
  title: L10n;
  description: L10n;
  details: L10n;
  price: number | null;
  show_price: boolean;
  for_sale: boolean;
  stock: number;
  metal_id: string | null;
  /** First of stone_ids, kept for older readers. */
  stone_id: string | null;
  stone_ids: string[];
  /** Gold only: 18, 14 or 10. */
  karat: number | null;
  weight_g: number | null;
  /** Total carats per stone, by attribute id. */
  stone_carats: Record<string, number>;
  visible: boolean;
  featured: boolean;
  position: number;
  seo_title: L10n;
  seo_description: L10n;
  published_at: string;
  updated_at?: string;
  piece_images: PieceImage[];
  piece_variants: PieceVariant[];
}

export interface EventItem {
  id: string;
  slug: string;
  title: L10n;
  starts_at: string;
  ends_at: string | null;
  location: string;
  summary: L10n;
  body: L10n;
  image_url: string | null;
  link_url: string | null;
  published: boolean;
}

export interface PressArticle {
  id: string;
  title: L10n;
  publication: string;
  published_on: string | null;
  image_url: string | null;
  url: string | null;
  file_url: string | null;
  position: number;
  published: boolean;
}

export interface InstagramPost {
  id: string;
  instagram_id: string;
  image_url: string;
  caption: string;
  permalink: string;
  media_type: string;
  taken_at: string | null;
  visible: boolean;
}

export interface Address {
  line1?: string;
  line2?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}

export interface Customer {
  user_id: string;
  email: string;
  name: string;
  phone: string | null;
  address: Address;
  locale: string;
}

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  piece_id: string | null;
  variant_id: string | null;
  title: string;
  variant: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
}

export interface Order {
  id: string;
  number: number;
  customer_id: string | null;
  email: string;
  name: string;
  phone: string | null;
  shipping_address: Address;
  locale: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  /** The VAT the order was sold with, set when it is paid. */
  vat_rate: number | null;
  vat_country: string | null;
  vat_scheme: 'belgium' | 'oss' | 'export' | null;
  payment_method: string | null;
  paid_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  gift_wrap: boolean;
  gift_message: string | null;
  note: string | null;
  invoice_number: string | null;
  invoiced_at: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface AppointmentRequest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferred_date: string | null;
  message: string;
  piece_id: string | null;
  locale: string;
  handled: boolean;
  created_at: string;
}
