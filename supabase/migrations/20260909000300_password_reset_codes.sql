-- Password reset codes are service-role-only records used by the reset-password
-- Edge Function. Codes are stored as SHA-256 hashes and expire quickly.

begin;

create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recovery_email text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_codes_user_active_idx
  on public.password_reset_codes (user_id, created_at desc)
  where used_at is null;

alter table public.password_reset_codes enable row level security;
revoke all on public.password_reset_codes from anon, authenticated;

notify pgrst, 'reload schema';

commit;