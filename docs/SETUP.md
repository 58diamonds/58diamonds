# Setup

Everything needed to take the site live. Steps 1 to 4 are one-off; after that
the client runs the site from `/admin`.

## 1. Supabase (database, logins, photos)

1. Create a project at supabase.com (region: Frankfurt).
2. SQL editor: paste and run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`
   (starting sections, filters, sample pieces, About and legal pages, menus).
3. Authentication > Sign In / Providers > Email: keep "Confirm email" on (clients confirm their address).
4. Multi-Factor is not needed: admins sign in with username and password only.
5. Authentication > URL configuration: Site URL = `https://DOMAIN`. Redirect URLs: `https://DOMAIN/**`.
6. Project settings > API: copy the URL, the anon key and the service role key.
7. Create the first admin from a computer with the repo and `.env.local` filled in:

   ```bash
   npm run create-admin -- farah farah@example.com 'a long password'
   ```

   The password needs at least 8 characters, with one capital letter, one
   number and one special character. Farah then signs in at `/admin` with the
   username and password. Further admins are added in Admin > Admins, where an
   admin can also set a new password for another admin.

## 2. Vercel (hosting)

1. The GitHub repo `58diamonds/58diamonds` is connected to the Vercel project; pushing to `main` deploys.
2. Environment variables (all environments), see `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://DOMAIN`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`, `MAIL_FROM`, optionally `ADMIN_EMAIL`
   - `CRON_SECRET` = any long random string (Vercel Cron sends it to the daily Instagram sync)
3. Redeploy after changing variables.

## 2b. Stripe (payments)

1. Stripe account in Farah's company name, activated (company details, bank account).
2. Settings > Payment methods: switch on Cards, Bancontact, iDEAL, Apple Pay, Google Pay
   and PayPal. Checkout shows whichever apply to the buyer's country.
3. Developers > Webhooks > Add endpoint: `https://DOMAIN/api/stripe/webhook`, events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`. Copy the signing secret.
4. Developers > API keys: copy the secret key. Test with test keys first, then swap to live keys.
5. Recommended: Radar rule "Review if amount > 5000 EUR" so large card orders are checked by hand.

Without Stripe keys the bag works but checkout says payments are not set up yet.

## 2c. Resend (order emails)

1. resend.com > Domains > add `DOMAIN`, then add the DNS records it shows at GoDaddy.
2. API keys > create one; set `RESEND_API_KEY` and `MAIL_FROM` (an address on that domain).

Emails sent: order confirmation with the PDF invoice, shipped with tracking,
and to Farah: new order and new appointment request.

## 3. Domain (GoDaddy)

In Vercel: Project > Settings > Domains, add `DOMAIN` and `www.DOMAIN`. Vercel
then shows the exact records; at the time of writing they are:

| Type  | Name | Value                  |
| ----- | ---- | ---------------------- |
| A     | @    | 76.76.21.21            |
| CNAME | www  | cname.vercel-dns.com   |

In GoDaddy: My Products > the domain > DNS. Delete GoDaddy's default "Parked"
A record and any `www` record first, then add the two above. HTTPS is issued
by Vercel automatically once DNS has propagated.

## 4. Instagram

The homepage shows the latest posts, copied into our own storage every
morning (Instagram's own image links expire, so we never hotlink them).

The account must be a Business or Creator account (Instagram app > Settings >
Account type). Then:

1. developers.facebook.com > Create app > use case "Manage messaging and
   content on Instagram" (Instagram API with Instagram Login).
2. In the app: Instagram > API setup > add the 58diamondsbyfarah account as a
   tester / generate an access token for it (the client logs in once to approve).
3. Copy the token, sign in to `/admin/instagram`, paste it, Connect.

The token lasts 60 days and is renewed automatically by each sync. If the app
was made with Facebook Login instead, also set `INSTAGRAM_APP_ID` and
`INSTAGRAM_APP_SECRET` in Vercel so the token can be renewed.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in, or leave empty for sample content
npm run dev                  # http://localhost:3000, admin at /admin
npm test                     # database rules and formatting
npm run typecheck
```

Without Supabase keys the site renders the sample content in `lib/demo.ts`, so
the design can be reviewed before the database exists.
