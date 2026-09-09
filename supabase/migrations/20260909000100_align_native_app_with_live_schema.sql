-- Add the small native-client fields that are not part of the normalized
-- mailbox model. Message ownership, addresses, and folders remain normalized.

begin;

alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists notification_email text,
  add column if not exists preferences jsonb not null default '{}'::jsonb,
  add column if not exists recent_searches jsonb not null default '[]'::jsonb;

alter table public.user_settings
  add column if not exists vacation_reply_enabled boolean not null default false,
  add column if not exists vacation_reply_message text not null default '',
  add column if not exists preferences jsonb not null default '{}'::jsonb;

alter table public.emails
  add column if not exists category text not null default 'primary',
  add column if not exists preview text not null default '';

alter table public.oauth_applications
  add column if not exists logo_url text,
  add column if not exists is_first_party boolean not null default false,
  add column if not exists client_type text not null default 'public',
  add column if not exists client_secret_hash text,
  add column if not exists status text not null default 'active';

alter table public.oauth_authorization_codes
  add column if not exists code_challenge text,
  add column if not exists code_challenge_method text not null default 'S256';

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

insert into public.folders (user_id, name, type, icon)
select distinct f.user_id, 'Archive', 'custom', 'archive'
from public.folders f
where not exists (
  select 1 from public.folders existing
  where existing.user_id = f.user_id and existing.type = 'custom' and existing.name = 'Archive'
);

create or replace function public.create_default_folders()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.folders (user_id, name, type, icon)
  values
    (new.id, 'Inbox', 'inbox', 'inbox'),
    (new.id, 'Sent', 'sent', 'send'),
    (new.id, 'Drafts', 'drafts', 'file-text'),
    (new.id, 'Archive', 'custom', 'archive'),
    (new.id, 'Spam', 'spam', 'alert-circle'),
    (new.id, 'Trash', 'trash', 'trash-2');
  return new;
end;
$function$;

grant select, insert, update on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.email_addresses to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.emails to authenticated;
grant select, insert, update, delete on public.folders to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;

notify pgrst, 'reload schema';

commit;