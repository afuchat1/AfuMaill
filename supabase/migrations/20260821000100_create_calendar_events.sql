create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_time text,
  duration text,
  color text not null default '#2563EB',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists calendar_events_owner_date_idx
  on public.calendar_events (owner_id, event_date);

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_select_own" on public.calendar_events;
create policy "calendar_events_select_own"
  on public.calendar_events for select
  using (auth.uid() = owner_id);

drop policy if exists "calendar_events_insert_own" on public.calendar_events;
create policy "calendar_events_insert_own"
  on public.calendar_events for insert
  with check (auth.uid() = owner_id);

drop policy if exists "calendar_events_update_own" on public.calendar_events;
create policy "calendar_events_update_own"
  on public.calendar_events for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "calendar_events_delete_own" on public.calendar_events;
create policy "calendar_events_delete_own"
  on public.calendar_events for delete
  using (auth.uid() = owner_id);