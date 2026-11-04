-- =====================================================================
-- 0053 - How long an appointment takes
-- An appointment keeps its length in minutes; none is an hour, as before.
-- Google Calendar shows it, and a length changed there comes back.
-- Run once in the Supabase SQL editor, after 0052.
-- =====================================================================

alter table public.items
  add column duration_minutes smallint
    check (duration_minutes is null or duration_minutes between 5 and 1440);
