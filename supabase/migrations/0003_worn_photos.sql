-- A piece's photo on a model. The homepage squares pick it first and the
-- collection shows it when a card is hovered.
alter table piece_images add column if not exists worn boolean not null default false;
