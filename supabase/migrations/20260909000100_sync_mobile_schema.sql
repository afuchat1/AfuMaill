-- Keep the live Supabase schema aligned with the native AfuMail app.

begin;

-- Profile fields used by registration, account settings, password recovery,
-- signature insertion, vacation replies, search history, and preferences.
alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists recovery_email text,
  add column if not exists notification_email text,
  add column if not exists signature text not null default '',
  add column if not exists vacation_reply_enabled boolean not null default false,
  add column if not exists vacation_reply_message text not null default '',
  add column if not exists preferences jsonb not null default '{}'::jsonb,
  add column if not exists recent_searches jsonb not null default '[]'::jsonb;

-- OAuth tables are consumed by the oauth and developer-apps Edge Functions.
create table if not exists public.oauth_clients (
  client_id text primary key,
  name text not null,
  logo_url text,
  redirect_uris jsonb not null default '[]'::jsonb,
  scopes jsonb not null default '["profile","email"]'::jsonb,
  is_first_party boolean not null default false,
  owner_id uuid references auth.users(id) on delete cascade,
  client_type text not null default 'public'
    check (client_type in ('public', 'confidential')),
  client_secret_hash text,
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists oauth_clients_owner_idx
  on public.oauth_clients (owner_id);

create table if not exists public.oauth_authorization_codes (
  code text primary key,
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  scope text not null default 'profile email',
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists oauth_codes_expires_idx
  on public.oauth_authorization_codes (expires_at);

create table if not exists public.oauth_tokens (
  access_token text primary key,
  refresh_token text unique not null,
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'profile email',
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists oauth_tokens_user_client_idx
  on public.oauth_tokens (user_id, client_id)
  where revoked = false;

-- RLS and privileges must both be present for PostgREST access.
alter table public.profiles enable row level security;
alter table public.emails enable row level security;
alter table public.calendar_events enable row level security;
alter table public.oauth_clients enable row level security;
alter table public.oauth_authorization_codes enable row level security;
alter table public.oauth_tokens enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read own emails" on public.emails;
create policy "Users can read own emails"
  on public.emails for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own emails" on public.emails;
create policy "Users can insert own emails"
  on public.emails for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update own emails" on public.emails;
create policy "Users can update own emails"
  on public.emails for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own emails" on public.emails;
create policy "Users can delete own emails"
  on public.emails for delete
  using (auth.uid() = owner_id);

drop policy if exists "Clients are publicly readable" on public.oauth_clients;
create policy "Clients are publicly readable"
  on public.oauth_clients for select
  using (true);

-- OAuth codes and tokens are service-role-only. The Edge Functions perform all
-- writes and enforce ownership/authentication before using the service key.
revoke all on public.oauth_authorization_codes from anon, authenticated;
revoke all on public.oauth_tokens from anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.emails to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
grant select on public.oauth_clients to anon, authenticated;

insert into public.oauth_clients (
  client_id,
  name,
  logo_url,
  redirect_uris,
  scopes,
  is_first_party
)
values (
  'afumail-demo-app',
  'AfuMail OAuth Demo',
  null,
  '["afumail://oauth/demo-callback", "https://mail.afuchat.com/oauth/demo-callback"]'::jsonb,
  '["profile","email"]'::jsonb,
  true
)
on conflict (client_id) do update
  set redirect_uris = excluded.redirect_uris;

-- Ask PostgREST to refresh its schema cache after creating a missing table.
notify pgrst, 'reload schema';

commit;