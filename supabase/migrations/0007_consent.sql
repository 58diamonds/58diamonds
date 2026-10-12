-- Proof of what buyers and subscribers agreed to, and the buyer details an
-- invoice needs.

-- Newsletter double opt-in: an address only counts once its owner clicks the
-- link in the confirmation email. "source" says which form it came from.
alter table newsletter_subscribers add column if not exists confirm_token uuid not null default gen_random_uuid();
alter table newsletter_subscribers add column if not exists confirmed_at timestamptz;
alter table newsletter_subscribers add column if not exists source text;

-- Orders: when the buyer ticked "I accept the terms", the billing address
-- (the invoice goes to the buyer, who may ship elsewhere) and a business
-- buyer's VAT number.
alter table orders add column if not exists terms_accepted_at timestamptz;
alter table orders add column if not exists billing_address jsonb not null default '{}'::jsonb;
alter table orders add column if not exists buyer_vat text;
