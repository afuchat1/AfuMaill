-- Align the native AfuMail client with the existing normalized Supabase model.
-- This migration is additive and preserves existing profile, address, folder,
-- message, and OAuth records.

begin;

alter table public.profiles
  add column if not exists username text,
  add column if not exists email text,
  add column if not exists phone_number text,
  add column if not exists recovery_email text,
  add column if not exists notification_email text,
  add column if not exists preferences jsonb not null default '{}'::jsonb,
  add column if not exists recent_searches jsonb not null default '[]'::jsonb;

alter table public.user_settings
  add column if not exists vacation_reply_enabled boolean not null default false,
  add column if not exists vacation_reply_message text not null default '',
  add column if not exists preferences jsonb not null default '{}'::jsonb,
  add column if not exists recent_searches jsonb not null default '[]'::jsonb;

alter table public.emails
  add column if not exists folder text not null default 'inbox',
  add column if not exists category text not null default 'primary',
  add column if not exists preview text not null default '';

-- Backfill the compatibility identity fields from each user's primary address.
update public.profiles p
set
  username = coalesce(p.username, a.local_part),
  email = coalesce(p.email, coalesce(a.full_email, a.local_part || '@' || a.domain))
from public.email_addresses a
where a.user_id = p.id
  and a.is_primary
  and (p.username is null or p.email is null);

-- Accounts without a primary address can still be recovered from Supabase Auth.
update public.profiles p
set
  username = coalesce(p.username, split_part(u.email, '@', 1)),
  email = coalesce(p.email, u.email)
from auth.users u
where u.id = p.id
  and u.email is not null
  and (p.username is null or p.email is null);

create unique index if not exists profiles_username_compat_key
  on public.profiles (lower(username))
  where username is not null;

create unique index if not exists profiles_email_compat_key
  on public.profiles (lower(email))
  where email is not null;

update public.emails e
set folder = f.type
from public.folders f
where e.folder_id = f.id;

update public.emails
set folder = case
  when is_draft then 'drafts'
  when deleted_at is not null then 'trash'
  else coalesce(folder, 'inbox')
end;

update public.emails
set preview = left(
  regexp_replace(coalesce(body_text, body_html, ''), '[[:space:]]+', ' ', 'g'),
  140
)
where preview = '';

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.emails enable row level security;
alter table public.email_addresses enable row level security;
alter table public.folders enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.email_addresses to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.emails to authenticated;
grant select, insert, update, delete on public.folders to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;

notify pgrst, 'reload schema';

commit;