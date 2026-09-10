-- Store optional profile photos in a public bucket so mail recipients can
-- render them without exposing the profiles table to every mailbox query.

begin;

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "profile avatars are publicly readable" on storage.objects;
create policy "profile avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

drop policy if exists "users can upload their profile avatar" on storage.objects;
create policy "users can upload their profile avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "users can replace their profile avatar" on storage.objects;
create policy "users can replace their profile avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "users can remove their profile avatar" on storage.objects;
create policy "users can remove their profile avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

notify pgrst, 'reload schema';

commit;