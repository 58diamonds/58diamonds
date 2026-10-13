-- How the big homepage photo is framed (Admin > Homepage):
-- hero_fit 'cover' fills a fixed frame (3:2 on computers, 4:5 on phones) and crops,
-- 'whole' shows the photo uncropped in its own shape.
-- hero_focus is the spot kept in view when cropping, as CSS "x% y%".
alter table settings add column if not exists hero_fit text not null default 'cover' check (hero_fit in ('cover', 'whole'));
alter table settings add column if not exists hero_focus text not null default '50% 40%' check (hero_focus ~ '^\d{1,3}% \d{1,3}%$');
