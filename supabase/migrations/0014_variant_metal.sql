-- A piece can be offered in several gold colours as well as sizes:
-- each option (row) can name its colour; the size label may then be empty.
alter table piece_variants add column if not exists metal_id uuid references attributes(id) on delete set null;
