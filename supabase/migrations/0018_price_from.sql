-- "From €X" instead of "Price on request": while a piece's price is hidden, it
-- can show its price as a starting price. The piece still cannot be bought online.
alter table pieces add column if not exists price_from boolean not null default false;
