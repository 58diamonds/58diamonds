-- Booking calendar: clients pick a free time on the site, Farah approves it,
-- and everything is mirrored in her iCloud calendars over CalDAV.

-- A request with a picked time. `status` is null for requests sent with the
-- old free-text date (those keep using `handled`).
alter table appointment_requests add column if not exists starts_at timestamptz;
alter table appointment_requests add column if not exists ends_at timestamptz;
alter table appointment_requests add column if not exists status text
  check (status is null or status in ('pending', 'confirmed', 'declined', 'cancelled'));
-- Where the event sits in iCloud (the .ics resource), so it can be moved or removed.
alter table appointment_requests add column if not exists caldav_href text;
alter table appointment_requests add column if not exists caldav_uid text;
-- Secret for Farah's one-click Approve / Decline links.
alter table appointment_requests add column if not exists decision_token uuid not null default gen_random_uuid();
-- Secret for the client's cancel link.
alter table appointment_requests add column if not exists client_token uuid not null default gen_random_uuid();
alter table appointment_requests add column if not exists decided_at timestamptz;
alter table appointment_requests add column if not exists decision_note text check (decision_note is null or char_length(decision_note) <= 2000);
alter table appointment_requests add column if not exists client_reminded_at timestamptz;
alter table appointment_requests add column if not exists farah_reminded_at timestamptz;

create index if not exists appointment_requests_starts_idx on appointment_requests (starts_at) where starts_at is not null;

-- Visitors may still only send a plain request; picked times go through the
-- server, which checks the slot first.
drop policy if exists "requests public insert" on appointment_requests;
create policy "requests public insert" on appointment_requests for insert
  with check (handled = false and status is null and starts_at is null);

-- One row (id = 1). Private: it holds the school calendar links and which of
-- Farah's calendars are read. The public page only ever gets free times.
create table if not exists booking_settings (
  id              int         primary key default 1 check (id = 1),
  enabled         boolean     not null default false,
  duration_min    int         not null default 60 check (duration_min between 15 and 480),
  buffer_min      int         not null default 15 check (buffer_min between 0 and 240),
  notice_hours    int         not null default 24 check (notice_hours between 0 and 720),
  horizon_weeks   int         not null default 8 check (horizon_weeks between 1 and 52),
  step_min        int         not null default 30 check (step_min in (15, 30, 60)),
  -- {"1": [["10:00","13:00"],["14:00","18:00"]], ...}; 1 = Monday ... 7 = Sunday, Brussels time.
  hours           jsonb       not null default '{}'::jsonb,
  -- ["2026-12-25", ...]
  closed_dates    jsonb       not null default '[]'::jsonb,
  -- iCloud calendar addresses that count as busy; null = all of them.
  busy_calendars  jsonb,
  -- iCloud calendars the site writes to (found or created on first use).
  requests_calendar text,
  main_calendar   text,
  todo_calendar   text,
  -- [{"name": "Smartschool", "url": "https://...", "busy": true, "allday_blocks": false}]
  ics_links       jsonb       not null default '[]'::jsonb,
  -- Free a pending hold after this many hours without an answer; null = never.
  auto_release_hours int      check (auto_release_hours is null or auto_release_hours between 1 and 720),
  updated_at      timestamptz not null default now()
);
insert into booking_settings (id) values (1) on conflict (id) do nothing;

alter table booking_settings enable row level security;
drop policy if exists "booking_settings admin" on booking_settings;
create policy "booking_settings admin" on booking_settings for all using (is_admin()) with check (is_admin());
