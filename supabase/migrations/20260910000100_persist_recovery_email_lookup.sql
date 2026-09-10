-- Let an authenticated user read the address linked as their recovery inbox
-- without exposing other users' mailbox rows through email_addresses.

begin;

create or replace function public.get_recovery_email()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce(
    nullif(trim(address.full_email), ''),
    trim(address.local_part) || '@' || trim(address.domain)
  )
  from public.profiles profile
  join public.email_addresses address
    on address.id = profile.recovery_email_address_id
  where profile.id = auth.uid()
    and lower(trim(address.domain)) = 'afuchat.com'
  limit 1;
$function$;

revoke all on function public.get_recovery_email() from public;
grant execute on function public.get_recovery_email() to authenticated;

notify pgrst, 'reload schema';

commit;