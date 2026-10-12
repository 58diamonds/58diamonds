# 58 Diamonds

Website and online shop for **58 Diamonds by Farah**, fine jewelry, by appointment only.
English, Dutch and French.

- Instagram: https://www.instagram.com/58diamondsbyfarah
- Domain: purchased at GoDaddy (DNS steps in `docs/SETUP.md`)

## What it does

Public site (`/en`, `/nl`, `/fr`):

- **Home**: hero, then blocks in the order chosen in admin (selected pieces,
  section tiles, story, events, Instagram, newsletter).
- **Shop**: All, Rings, Necklaces, Earrings, Bracelets (sections are editable),
  filters for metal, stone, price and availability, sorting by price and by
  date in both directions. Each piece has a gallery, sizes with their own stock,
  price or "Price on request", Add to bag, wishlist, WhatsApp and a viewing request.
- **Bag and checkout**: Stripe Checkout (cards, Bancontact, iDEAL, Apple Pay,
  Google Pay, PayPal), insured shipping, gift wrap and message. Stock is held
  for 30 minutes while paying. Confirmation email with a PDF invoice.
- **Client account**: email and password; orders, payment, tracking, invoices,
  details, wishlist.
- **Pages**: About, legal pages and any page the client adds. **Events**,
  **Press** (only when switched on and an article is published), **Contact**.
- SEO: one address per language with hreflang, sitemap, robots, product, event
  and store structured data, editable search texts per piece and page.

Admin at `/admin` (username and password; at least 8 characters with a capital,
a number and a special character). The shop is built but hidden until
`NEXT_PUBLIC_SHOP=on`: no bag, checkout, account or Orders and Clients in the admin.


- **Shop**: overview, orders (ship with tracking, status, invoice), pieces,
  sections and filters, clients and newsletter list.
- **Website**: homepage, pages, menus, every fixed text in three languages,
  events, press, Instagram.
- **Contact**: appointment requests. **Setup**: settings (contact, shipping,
  gift wrap, invoices), admins and security.

## Stack

Next.js 15 (App Router) and Tailwind CSS 4, Supabase for the database, logins
and photo storage, Stripe for payments, Resend for email, hosted on Vercel.

```
app/[locale]/      public pages, one tree per language
app/admin/         the admin
app/api/           checkout, Stripe webhook, invoices, account, admin, Instagram
components/        UI (site, account, admin)
lib/               data access, shop logic, emails, invoices, sample content
scripts/           seed generator, first admin
supabase/          schema with row-level security, seed, tests
docs/              setup guide and project notes
```

Security lives in the database: row-level security lets the public read only
what is published; clients see only their own orders; every change needs an
signed-in admin. `supabase/migrations.test.ts`
checks this on an in-memory Postgres.

Setup: `docs/SETUP.md`. Decisions and open items: `docs/project-notes.md`.
