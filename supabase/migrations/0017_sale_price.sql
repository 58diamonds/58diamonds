-- Sales (Black Friday and the like): a piece can be switched "On sale" with a
-- sale price. While on, the site shows the normal price crossed out next to the
-- sale price, and checkout charges the sale price. Off: back to normal.
alter table pieces add column if not exists sale_price numeric(12, 2) check (sale_price is null or sale_price >= 0);
alter table pieces add column if not exists on_sale boolean not null default false;
