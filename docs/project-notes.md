# Project notes

Shared notes for the 58 Diamonds website. Update after each decision or finished step.
Setup steps are in `docs/SETUP.md`, the layout in `README.md`.

## Status

- 2026-10-08: Repository created (private, github.com/szaidman55/58diamonds).
- 2026-10-08: First version of the site and admin on branch `site/first-version`. Runs on sample content until Supabase is connected. Not deployed yet.
- 2026-10-08: Contract signed. Repo moved to github.com/58diamonds/58diamonds (public, Vercel Hobby deploys on push).
- 2026-10-09: Full build: shop from day one (sections, filters, sorting), Stripe checkout, client accounts, admin for nearly everything, EN/NL/FR, SEO.
- 2026-10-09: Real logo and product photos in. Company details set. Not live yet: waiting for Sacha's go before loading Supabase and pushing.
- 2026-10-12: Rebuilt in the ivory look with the first idea's menus. Shop built but hidden (`NEXT_PUBLIC_SHOP` unset). Admin sign-in is username + password only.
- 2026-10-12: LIVE on https://58diamonds.vercel.app. Supabase loaded (22 pieces, pages, menu), admins farah and sacha created, Vercel env vars set. Vercel framework preset set to Next.js. The first deploy was done with the Vercel CLI because the Git link failed ("Git information retrieval failed"). The Git link was then reconnected so pushes to main deploy again.
- 2026-10-12: All pieces set to "Price on request" and placeholder prices cleared. Farah enters real prices and turns "Show the price" on per piece.

## Facts

- Brand: 58 Diamonds by Farah. Private jeweler, custom designed diamond jewelry, HRD-certified gemologist. By appointment only.
- Instagram: https://www.instagram.com/58diamondsbyfarah (about 770 followers). Bio: "Private Jeweler, Custom designed jewellery with diamonds. HRD certified gemologist."
- Work seen on Instagram: engagement rings (emerald-cut halo), tennis bracelets and necklaces, marquise and evil-eye pieces with pink sapphires, feather ring, wrap rings. Photos are close-ups on warm beige velvet or gold sparkle.
- Company: 58 Diamonds, Hoveniersstraat 50, 2018 Antwerp, Belgium. BTW BE0711864093. Shown in the footer, invoices, legal pages and store structured data. Event times use `Europe/Brussels` (`lib/config.ts`).
- Logo: rebuilt as SVG from the original `logoFINAL.ai` into `public/brand/` (ink, gold, foil, header lockups, mark for the favicon). The new logo has no "Private Jeweler" line.
- Photos: 22 pieces by photographer Ilan Taché, white and black backgrounds, in `public/pieces/` (NN-white.jpg, NN-black.jpg, 1600px). Square frames everywhere so nothing is cropped; hero is a cut-out photo (transparent background) shown whole over a warm brown radial gradient (#6A523C centre to #38302A edges); default hero is the wing earrings (`public/home/hero-wing-earrings.webp`). Sacha: no photographer credit on the site. Piece names, prices and texts in `lib/demo.ts` are placeholders.
- Domain: purchased at GoDaddy by the client. DNS not yet pointed anywhere.

## Stack and decisions

- Same stack as the tannin site: Next.js 15 + Tailwind 4, Supabase (database, auth, storage), Vercel. One app: public site and `/admin` together, so one Vercel project.
- Security is in the database (row-level security, `is_admin()`); the admin screens only decide what to show. `supabase/migrations.test.ts` checks the rules on PGlite.
- Content lives in the database, not the repo. `lib/demo.ts` is only for previews without a database.
- Instagram is synced, not embedded: images are copied to the `media` bucket (Instagram links expire). Daily Vercel Cron on `/api/instagram`; hidden posts stay hidden.
- Prices: a piece shows its price only if it has one, its "show price" switch is on and its section allows prices. Otherwise "Price on request". Sold pieces say "Sold".
- Hiding a section hides its pieces too. Deleting a section keeps its pieces ("Not in a section").
- Photos are resized to 2000px in the browser before upload.
- Style: the ivory look Farah chose (ivory, ink, gold; Cormorant Garamond + Montserrat), with the menus and features of the first idea. Header logo has three options (as is, black, gold; the "58 DIAMONDS" text always takes the same colour as the diamond), chosen in Admin > Homepage; the header stays ivory. All colours and fonts are tokens in `app/globals.css` and `app/layout.tsx`.
- Never use em dashes anywhere.

- Shop from day one, own build with Stripe (no Shopify). Sections All, Rings, Necklaces, Earrings, Bracelets; sort by price and by date, both directions.
- Admin login: username + password only (2026-10-12, no authenticator). Password rule: at least 8 characters, one capital, one number, one special character (`lib/password.ts`). Client login: email + password.
- Shop is built but hidden (2026-10-12): `NEXT_PUBLIC_SHOP=on` switches it on. While off, middleware returns 404 for bag, checkout, account and the shop APIs, and the admin has no Orders or Clients. Pieces get a "Sold" switch instead of stock.
- The admin can add, edit and delete menu items, pages and pieces (Overview has quick add buttons).
- Approved extras (2026-10-09): ring sizes with stock per size; Bancontact, iDEAL, Apple Pay, Google Pay, PayPal via Stripe; insured tracked shipping with a shipped email; PDF invoices with VAT (numbers YYYY-0001); legal pages; wishlist; gift wrap and message; newsletter signup. Declined: certificate PDF per piece.
- Press tab shows only when switched on in admin AND at least one article is published.
- Stock is held for 30 minutes during checkout (pending orders count as reserved).
- Every fixed text lives in `lib/texts.ts` with EN/NL/FR defaults; the admin overrides them in `site_texts`.
- `supabase/seed.sql` is generated from `lib/demo.ts` (`npm run seed:sql`).
- Never put overlays or opacity over the jewelry in photos. Do not use the emerald-cut photo (04).

## Open items

- Waiting for Farah: WhatsApp number, email, phone, meaning of "58", her story for About us, real piece names and prices, real photo of Farah for About. Photographer is not credited (Sacha, 2026-10-09).
- The account must be Business or Creator for the Instagram sync.
- Create the Supabase project and Vercel project, then point GoDaddy DNS (see SETUP).
- Waiting for Farah: Stripe account, sending domain for Resend, shipping price and countries, real piece texts and prices.
- Legal pages are a starting draft; to be checked by her accountant or lawyer before launch.
- Possible later: bespoke request form with inspiration photo upload, event RSVP list, bookable time slots.
