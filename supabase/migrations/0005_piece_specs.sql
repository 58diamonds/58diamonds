-- Gold karat, weight and carats per stone, shown in the piece's details.
alter table pieces add column if not exists karat smallint check (karat in (10, 14, 18));
alter table pieces add column if not exists weight_g numeric(8, 2) check (weight_g >= 0);
-- Total carats per stone on the piece: {"<attribute id>": 1.2}.
alter table pieces add column if not exists stone_carats jsonb not null default '{}'::jsonb;
