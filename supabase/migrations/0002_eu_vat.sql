-- EU VAT on online sales (lib/vat.ts): Belgian VAT up to the EUR 10,000
-- threshold for sales to private buyers in other EU countries, then the
-- buyer's country rate (OSS). Each paid order keeps the VAT it was sold with.

alter table settings add column if not exists oss_registered boolean not null default false;
-- Rates that differ from the built-in table, per country code: {"FR": 20}.
alter table settings add column if not exists eu_vat_rates jsonb not null default '{}'::jsonb;

alter table orders add column if not exists vat_rate numeric(5, 2);
alter table orders add column if not exists vat_country text;
alter table orders add column if not exists vat_scheme text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_vat_scheme_check') then
    alter table orders add constraint orders_vat_scheme_check check (vat_scheme in ('belgium', 'oss', 'export'));
  end if;
end $$;
