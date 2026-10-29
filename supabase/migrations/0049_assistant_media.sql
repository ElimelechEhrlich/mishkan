-- =====================================================================
-- 0049 - Photos and voice messages kept in the assistant's conversation
-- A photo or a voice message sent to the assistant is kept, so it can be
-- opened or heard again in the conversation. It is kept in the private
-- assistant-media bucket, in a folder of the parent's own sign-in id: only
-- that parent can add, open or remove it. It stays until the conversation
-- is cleared.
-- Run once in the Supabase SQL editor, after 0048.
-- =====================================================================

alter table public.assistant_messages
  -- The photo or recording sent with the message, in the assistant-media bucket.
  add column media_path    text,
  add column media_kind    text check (media_kind in ('image', 'audio')),
  -- How long a recording runs, to show before it is played.
  add column media_seconds numeric(6,1) check (media_seconds >= 0),
  add constraint assistant_media_whole check (
    (media_path is null) = (media_kind is null)
    and (media_seconds is null or media_kind = 'audio')
  );

insert into storage.buckets (id, name, public)
values ('assistant-media', 'assistant-media', false)
on conflict (id) do nothing;

create policy assistant_media_own on storage.objects for all to authenticated
  using (
    bucket_id = 'assistant-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'assistant-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
