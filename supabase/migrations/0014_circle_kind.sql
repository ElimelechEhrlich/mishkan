-- =====================================================================
-- 0014 - A new kind of entity: a separate circle, such as family and friends
-- Only adds the kind; 0015 uses it. They are two files because a new kind
-- cannot be used in the same run that adds it.
-- Run once in the Supabase SQL editor, after 0013, and then run 0015.
-- =====================================================================

alter type public.entity_kind add value if not exists 'circle';
