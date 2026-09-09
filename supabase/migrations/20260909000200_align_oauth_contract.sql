-- The linked project already uses oauth_applications as the canonical OAuth
-- table. Add the fields required by the PKCE and developer-app edge functions
-- without replacing the existing application/token relationships.

begin;

alter table public.oauth_applications
  add column if not exists logo_url text,
  add column if not exists is_first_party boolean not null default false,
  add column if not exists client_type text not null default 'public',
  add column if not exists client_secret_hash text,
  add column if not exists status text not null default 'active';

alter table public.oauth_applications
  alter column client_secret drop not null;

alter table public.oauth_authorization_codes
  add column if not exists code_challenge text,
  add column if not exists code_challenge_method text not null default 'S256';

update public.oauth_applications
set client_type = coalesce(nullif(client_type, ''), 'public'),
    status = coalesce(nullif(status, ''), 'active')
where client_type is null or client_type = '' or status is null or status = '';

alter table public.oauth_applications enable row level security;
alter table public.oauth_authorization_codes enable row level security;
alter table public.oauth_tokens enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on
  public.profiles,
  public.email_addresses,
  public.folders,
  public.emails,
  public.user_settings,
  public.calendar_events,
  public.oauth_applications,
  public.oauth_authorization_codes,
  public.oauth_tokens
to service_role;

notify pgrst, 'reload schema';

commit;