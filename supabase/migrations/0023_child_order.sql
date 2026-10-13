-- =====================================================================
-- 0023 - The order of the children
-- The children are shown oldest first, by the birth dates that were entered.
-- A parent can move a child up or down; from then on the order they set is
-- kept, until they ask to sort by age again. Null means "by age".
-- Nothing that exists is changed.
-- Run once in the Supabase SQL editor, after 0022.
-- =====================================================================

alter table public.entities add column position double precision;
