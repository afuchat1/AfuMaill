-- The password-reset Edge Function uses the Supabase service role through
-- PostgREST. Keep the table inaccessible to client roles while explicitly
-- granting the function role the operations it needs.

begin;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.password_reset_codes to service_role;

notify pgrst, 'reload schema';

commit;