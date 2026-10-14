-- Shipping per country (Admin > Shipping): {"BE": {"percent": 1, "fixed": 50, "round_to": 5}, ...}.
-- A country without a rate cannot be shipped to; ship_to follows the rates.
-- Starts with the whole EU at 1% of the pieces' value + EUR 50, rounded up to the next EUR 5 (Sacha, 2026-10-14).
alter table settings add column if not exists shipping_rates jsonb not null default '{}'::jsonb;

update settings
   set shipping_rates = (
         select jsonb_object_agg(c, '{"percent": 1, "fixed": 50, "round_to": 5}'::jsonb)
           from unnest(array['AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK']) as c
       ),
       ship_to = array['AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK']
 where shipping_rates = '{}'::jsonb;
