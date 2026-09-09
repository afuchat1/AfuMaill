-- Keep recovery and mailbox linking inside AfuChat.
--
-- Existing non-primary external aliases are intentionally left in place for
-- now, but they cannot be selected, linked, or used for password recovery.

begin;

create or replace function public.afuchat_email_exists(_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    lower(trim(coalesce(_email, ''))) ~ '^[^[:space:]@]+@afuchat[.]com$'
    and exists (
      select 1
      from public.email_addresses
      where lower(trim(domain)) = 'afuchat.com'
        and lower(trim(coalesce(full_email, local_part || '@' || domain))) = lower(trim(_email))
    );
$function$;

revoke all on function public.afuchat_email_exists(text) from public;
grant execute on function public.afuchat_email_exists(text) to anon, authenticated;

create or replace function public.set_recovery_email(_email text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(_email, '')));
  v_addr_id uuid;
  v_addr_owner uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if v_email = '' then
    update public.profiles
       set recovery_email_address_id = null,
           updated_at = now()
     where id = v_uid;
    return;
  end if;

  if v_email !~ '^[^[:space:]@]+@afuchat[.]com$' then
    raise exception 'Recovery address must be an AfuChat address (username@afuchat.com)'
      using errcode = 'check_violation';
  end if;

  select id, user_id
    into v_addr_id, v_addr_owner
    from public.email_addresses
   where lower(trim(domain)) = 'afuchat.com'
     and lower(trim(coalesce(full_email, local_part || '@' || domain))) = v_email
   limit 1;

  if v_addr_id is null then
    raise exception 'That AfuChat address does not exist yet. Create the account before linking it.'
      using errcode = 'check_violation';
  end if;

  if v_addr_owner = v_uid then
    raise exception 'Recovery address must belong to a different AfuChat mailbox than your own'
      using errcode = 'check_violation';
  end if;

  update public.profiles
     set recovery_email_address_id = v_addr_id,
         updated_at = now()
   where id = v_uid;
end;
$function$;

revoke all on function public.set_recovery_email(text) from public;
grant execute on function public.set_recovery_email(text) to authenticated;

create or replace function public.enforce_afuchat_email_address()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if lower(trim(coalesce(new.domain, ''))) <> 'afuchat.com' then
    raise exception 'Only @afuchat.com mailbox addresses are allowed in this table'
      using errcode = 'check_violation';
  end if;

  if new.full_email is not null
     and lower(trim(new.full_email)) !~ '^[^[:space:]@]+@afuchat[.]com$' then
    raise exception 'Mailbox address must use the @afuchat.com domain'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_afuchat_email_address on public.email_addresses;
create trigger enforce_afuchat_email_address
before insert or update of local_part, domain, full_email
on public.email_addresses
for each row
execute function public.enforce_afuchat_email_address();

notify pgrst, 'reload schema';

commit;