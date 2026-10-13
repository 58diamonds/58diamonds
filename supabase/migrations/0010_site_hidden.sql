-- While true, the public site shows only the logo (a holding page). People with
-- the private preview link (Admin > Settings) see the whole site. The admin is not affected.
alter table settings add column if not exists site_hidden boolean not null default false;
