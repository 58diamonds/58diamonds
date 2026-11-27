-- Pick up in Antwerp: the bag offers it next to shipping (Admin > Settings can
-- switch it off). An order remembers which the buyer chose.
alter table settings add column if not exists pickup_enabled boolean not null default true;
alter table orders add column if not exists delivery text not null default 'ship';
alter table orders drop constraint if exists orders_delivery_check;
alter table orders add constraint orders_delivery_check check (delivery in ('ship', 'pickup'));
