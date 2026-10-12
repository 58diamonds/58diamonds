-- A piece can have several stones, and a stone can have a longer name for the
-- piece page ("LG Diamond" in the filter, "Laboratory Grown Diamond" on the piece).

alter table attributes add column if not exists full_label jsonb not null default '{}'::jsonb;

alter table pieces add column if not exists stone_ids uuid[] not null default '{}';
-- stone_id stays, kept equal to the first stone, for anything that still reads it.
update pieces set stone_ids = array[stone_id] where stone_id is not null and stone_ids = '{}';
