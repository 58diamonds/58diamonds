-- Unique visitors (Admin > Overview): how many different people opened the
-- public site today, in the last 7 days and in the last 30 days.
--
-- No IP address is stored. The middleware turns IP address + browser into a
-- one-way code with the server's secret key (lib/visitors.ts) and stores that
-- code once per day. Rows older than 35 days are deleted. No cookies.
create table if not exists site_visits (
  day date not null,
  visitor text not null,
  primary key (day, visitor)
);
alter table site_visits enable row level security;
-- No policies: only the server (service role) writes; owners and admins read
-- the totals through visitor_counts() below.

create or replace function visitor_counts() returns json
  language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Brussels')::date;
  result json;
begin
  if not is_manager() then raise exception 'not allowed'; end if;
  delete from site_visits where day < today - 35;
  select json_build_object(
    'today', count(distinct visitor) filter (where day = today),
    'yesterday', count(distinct visitor) filter (where day = today - 1),
    'week', count(distinct visitor) filter (where day > today - 7),
    'month', count(distinct visitor) filter (where day > today - 30),
    'days', coalesce((
      select json_agg(json_build_object('day', d.day, 'visitors', d.n) order by d.day)
      from (select day, count(*) as n from site_visits where day > today - 30 group by day) d
    ), '[]'::json)
  ) into result
  from site_visits where day > today - 30;
  return result;
end $$;
revoke all on function visitor_counts() from public, anon;
grant execute on function visitor_counts() to authenticated;
