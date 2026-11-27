-- Made to order: the delivery time shown to clients ("Delivery between 7-14
-- days") is now set per piece in Admin > Pieces, instead of fixed.
alter table pieces add column if not exists delivery_min_days integer not null default 7 check (delivery_min_days >= 0);
alter table pieces add column if not exists delivery_max_days integer not null default 14 check (delivery_max_days >= 0);
