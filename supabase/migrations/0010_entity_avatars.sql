-- =====================================================================
-- 0010 - A picture for each entity
-- An entity can show a photo (kept in the entity-avatars bucket) or an emoji
-- instead of its first letter. Photos are private to the household: the path is
-- {household_id}/{entity_id}/{file}, and only who can see the entity reaches it.
-- Run once in the Supabase SQL editor, after 0009.
-- =====================================================================

alter table public.entities
  add column avatar_emoji text check (avatar_emoji is null or length(avatar_emoji) <= 16),
  add column avatar_path  text;

insert into storage.buckets (id, name, public)
values ('entity-avatars', 'entity-avatars', false)
on conflict (id) do nothing;

create policy entity_avatars_all on storage.objects for all to authenticated
  using (
    bucket_id = 'entity-avatars'
    and public.can_see_entity(((storage.foldername(name))[2])::uuid)
  )
  with check (
    bucket_id = 'entity-avatars'
    and public.can_see_entity(((storage.foldername(name))[2])::uuid)
  );
