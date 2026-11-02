-- An option (gold colour and/or size) can have its own price; empty = the piece's price.
alter table piece_variants add column if not exists price numeric(12, 2);
-- A photo can belong to one gold colour; the piece page shows it when that colour is chosen.
alter table piece_images add column if not exists metal_id uuid references attributes(id) on delete set null;
