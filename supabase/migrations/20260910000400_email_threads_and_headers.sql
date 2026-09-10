-- Persist the RFC message headers needed to follow a conversation across
-- AfuMail, Gmail, Outlook, and other mail clients.

begin;

alter table public.emails
  add column if not exists thread_id text,
  add column if not exists message_id text,
  add column if not exists in_reply_to text,
  add column if not exists references_header text;

create index if not exists emails_user_thread_created_idx
  on public.emails (user_id, thread_id, created_at desc);

create index if not exists emails_user_message_id_idx
  on public.emails (user_id, message_id);

notify pgrst, 'reload schema';

commit;