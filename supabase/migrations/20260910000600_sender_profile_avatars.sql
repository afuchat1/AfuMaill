-- Extend the existing safe sender lookup with optional profile photos.
-- The mailbox visibility check remains in place so this does not become a
-- general profile directory.

begin;

drop function if exists public.get_afuchat_sender_display_names(text[]);

create function public.get_afuchat_sender_display_names(_emails text[])
returns table(email text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select
    lower(trim(coalesce(address.full_email, address.local_part || '@' || address.domain))) as email,
    nullif(trim(profile.full_name), '') as display_name,
    nullif(trim(profile.avatar_url), '') as avatar_url
  from public.email_addresses address
  join public.profiles profile
    on profile.id = address.user_id
  where lower(trim(address.domain)) = 'afuchat.com'
    and lower(trim(coalesce(address.full_email, address.local_part || '@' || address.domain)))
      = any (
        select lower(trim(requested_email))
        from unnest(coalesce(_emails, array[]::text[])) as requested_email
      )
    and exists (
      select 1
      from public.emails visible_email
      where visible_email.user_id = auth.uid()
        and position(
          lower(trim(coalesce(address.full_email, address.local_part || '@' || address.domain)))
          in lower(coalesce(visible_email.from_address, ''))
        ) > 0
    );
$function$;

revoke all on function public.get_afuchat_sender_display_names(text[]) from public;
grant execute on function public.get_afuchat_sender_display_names(text[]) to authenticated;

notify pgrst, 'reload schema';

commit;