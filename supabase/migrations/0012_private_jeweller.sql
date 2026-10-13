-- Admin > Homepage: show PRIVATE JEWELLER under the logo. Editors may change it.
alter table settings add column if not exists private_jeweller boolean not null default false;

create or replace function settings_editor_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
  declare
    allowed text[] := array['home_blocks', 'home_tiles', 'header_logo', 'private_jeweller', 'hero_image_url', 'hero_fit', 'hero_focus', 'about_image_url', 'events_enabled', 'press_enabled', 'updated_at'];
  begin
    if auth.uid() is not null and not is_manager()
       and (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
      raise exception 'Only an owner or admin can change these settings.';
    end if;
    return new;
  end;
  $$;
